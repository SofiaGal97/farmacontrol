// ============================================================
// SERVICIO DE USUARIOS Y SESIÓN (autenticación)
// ============================================================
import { initializeApp, getApps } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  initializeAuth,
  inMemoryPersistence,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  Timestamp,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../config/firebase';
import type { Rol, Usuario } from '../modelos/tipos';
import { correoAUsuario, usuarioACorreo } from '../logica/nombreUsuario';
import { registrarEnBitacora } from './bitacora';
import { guardarEnSegundoPlano } from './sincronizacion';

const coleccionUsuarios = collection(db, 'usuarios');
const documentoConfiguracion = doc(db, 'config', 'setup');

// ---------------- Sesión ----------------

/** Acepta un nombre de usuario (ej. "mercy") o un correo real */
export function iniciarSesion(usuario: string, contrasena: string) {
  return signInWithEmailAndPassword(auth, usuarioACorreo(usuario), contrasena);
}

export function cerrarSesion() {
  return signOut(auth);
}

export function recuperarContrasena(correo: string) {
  return sendPasswordResetEmail(auth, correo.trim());
}

/** Escucha el perfil (nombre y rol) del usuario que inició sesión */
export function escucharPerfil(
  uid: string,
  alRecibir: (perfil: Usuario | null) => void,
  alFallar: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(coleccionUsuarios, uid),
    (documento) => {
      alRecibir(documento.exists() ? ({ uid: documento.id, ...documento.data() } as Usuario) : null);
    },
    alFallar,
  );
}

// ---------------- Primer administrador ----------------

export type EstadoConfiguracion = 'configurado' | 'pendiente' | 'sin_conexion' | 'error';

/** ¿Ya se configuró el sistema (ya existe el primer administrador)? */
export async function estadoConfiguracion(): Promise<EstadoConfiguracion> {
  if (!navigator.onLine) return 'sin_conexion';
  try {
    // Si la base de datos no responde en 10 segundos, lo tomamos como error
    const limite = new Promise<never>((_, rechazar) => setTimeout(() => rechazar(new Error('tiempo agotado')), 10000));
    const documento = await Promise.race([getDoc(documentoConfiguracion), limite]);
    return documento.exists() ? 'configurado' : 'pendiente';
  } catch (error) {
    // Si no se pudo verificar (reglas aún no publicadas, base de datos no creada, etc.)
    // mostramos la opción igual: las reglas de seguridad impiden crear
    // un segundo administrador si el sistema ya estaba configurado.
    console.warn('No se pudo verificar la configuración inicial:', error);
    return 'error';
  }
}

/**
 * Crea la PRIMERA cuenta (administradora). Solo funciona una vez:
 * las reglas de seguridad lo impiden si ya existe "config/setup".
 */
export async function crearPrimerAdministrador(nombre: string, usuario: string, contrasena: string) {
  const correo = usuarioACorreo(usuario);
  const credencial = await createUserWithEmailAndPassword(auth, correo, contrasena);
  try {
    const lote = writeBatch(db);
    lote.set(doc(coleccionUsuarios, credencial.user.uid), {
      nombre: nombre.trim(),
      usuario: correoAUsuario(correo),
      correo,
      rol: 'admin',
      activo: true,
      creadoEn: Timestamp.now(),
    });
    lote.set(documentoConfiguracion, { completado: true, adminUid: credencial.user.uid, fecha: Timestamp.now() });
    await lote.commit(); // aquí sí esperamos: esta acción necesita internet
  } catch (error) {
    await deleteUser(credencial.user); // si falló, no dejamos una cuenta a medias
    throw error;
  }
}

// ---------------- Administración de usuarios ----------------

/**
 * Para crear un usuario nuevo SIN cerrar la sesión de la administradora,
 * usamos una segunda instancia de Firebase solo para ese registro.
 */
let authSecundaria: Auth | null = null;
function obtenerAuthSecundaria(): Auth {
  if (!authSecundaria) {
    const appSecundaria =
      getApps().find((a) => a.name === 'registro') ?? initializeApp(firebaseConfig, 'registro');
    authSecundaria = initializeAuth(appSecundaria, { persistence: inMemoryPersistence });
  }
  return authSecundaria;
}

export async function crearUsuario(
  nombre: string,
  usuario: string,
  contrasena: string,
  rol: Rol,
  administrador: Usuario,
) {
  const correo = usuarioACorreo(usuario);
  const authRegistro = obtenerAuthSecundaria();
  const credencial = await createUserWithEmailAndPassword(authRegistro, correo, contrasena);
  await signOut(authRegistro);

  const lote = writeBatch(db);
  lote.set(doc(coleccionUsuarios, credencial.user.uid), {
    nombre: nombre.trim(),
    usuario: correoAUsuario(correo),
    correo,
    rol,
    activo: true,
    creadoEn: Timestamp.now(),
  });
  registrarEnBitacora(lote, administrador, 'Usuario creado', `${nombre.trim()} — usuario "${correoAUsuario(correo)}" (${rol})`);
  await lote.commit();
}

export function cambiarRol(usuario: Usuario, rol: Rol, administrador: Usuario) {
  const lote = writeBatch(db);
  lote.update(doc(coleccionUsuarios, usuario.uid), { rol });
  registrarEnBitacora(lote, administrador, 'Rol cambiado', `${usuario.nombre}: ${usuario.rol} → ${rol}`);
  guardarEnSegundoPlano(lote, `cambiar rol de ${usuario.nombre}`);
}

export function cambiarEstadoUsuario(usuario: Usuario, activo: boolean, administrador: Usuario) {
  const lote = writeBatch(db);
  lote.update(doc(coleccionUsuarios, usuario.uid), { activo });
  registrarEnBitacora(
    lote,
    administrador,
    activo ? 'Usuario activado' : 'Usuario desactivado',
    usuario.nombre,
  );
  guardarEnSegundoPlano(lote, `${activo ? 'activar' : 'desactivar'} a ${usuario.nombre}`);
}

/** Escucha la lista de usuarios (solo administrador) */
export function escucharUsuarios(
  alRecibir: (usuarios: Usuario[]) => void,
  alFallar: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    coleccionUsuarios,
    (resultado) => {
      const usuarios = resultado.docs.map((d) => ({ uid: d.id, ...d.data() }) as Usuario);
      usuarios.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      alRecibir(usuarios);
    },
    alFallar,
  );
}
