// ============================================================
// HOOK DE SESIÓN
// Guarda quién inició sesión y su perfil (nombre y rol) para que
// cualquier pantalla lo pueda consultar con useSesion() o usePerfil().
// ============================================================
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { escucharPerfil } from '../servicios/usuarios';
import type { Usuario } from '../modelos/tipos';

interface EstadoSesion {
  usuarioAuth: User | null; // cuenta de Firebase (correo)
  perfil: Usuario | null; // datos del sistema (nombre, rol, activo)
  cargando: boolean;
}

const SesionContexto = createContext<EstadoSesion>({ usuarioAuth: null, perfil: null, cargando: true });

export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuarioAuth, setUsuarioAuth] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);
  // uid del usuario cuyo perfil ya se terminó de cargar
  const [perfilCargadoDe, setPerfilCargadoDe] = useState<string | null>(null);

  // 1. ¿Hay alguien con sesión iniciada? (funciona sin internet)
  useEffect(() => {
    return onAuthStateChanged(auth, (usuario) => {
      setUsuarioAuth(usuario);
      setCargandoAuth(false);
    });
  }, []);

  // 2. Si hay sesión, cargamos su perfil (nombre y rol) en tiempo real
  useEffect(() => {
    if (!usuarioAuth) {
      setPerfil(null);
      return;
    }
    const uid = usuarioAuth.uid;
    return escucharPerfil(
      uid,
      (datos) => {
        setPerfil(datos);
        setPerfilCargadoDe(uid);
      },
      () => {
        setPerfil(null);
        setPerfilCargadoDe(uid);
      },
    );
  }, [usuarioAuth]);

  const cargando = cargandoAuth || (usuarioAuth !== null && perfilCargadoDe !== usuarioAuth.uid);

  return (
    <SesionContexto.Provider value={{ usuarioAuth, perfil, cargando }}>
      {children}
    </SesionContexto.Provider>
  );
}

export function useSesion() {
  return useContext(SesionContexto);
}

/** Para pantallas internas: ya sabemos que hay un usuario con perfil */
export function usePerfil(): Usuario {
  const { perfil } = useContext(SesionContexto);
  if (!perfil) throw new Error('usePerfil se usó sin sesión iniciada');
  return perfil;
}
