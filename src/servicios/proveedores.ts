// ============================================================
// SERVICIO DE PROVEEDORES
// ============================================================
import { collection, doc, onSnapshot, Timestamp, writeBatch, type Unsubscribe } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { DatosProveedor, Proveedor, Usuario } from '../modelos/tipos';
import { registrarEnBitacora } from './bitacora';
import { guardarEnSegundoPlano } from './sincronizacion';

const coleccionProveedores = collection(db, 'proveedores');

export function escucharProveedores(
  alRecibir: (proveedores: Proveedor[]) => void,
  alFallar: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    coleccionProveedores,
    (resultado) => {
      const proveedores = resultado.docs.map((d) => ({ id: d.id, ...d.data() }) as Proveedor);
      proveedores.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      alRecibir(proveedores);
    },
    alFallar,
  );
}

export function crearProveedor(datos: DatosProveedor, usuario: Usuario) {
  const cambios = writeBatch(db);
  cambios.set(doc(coleccionProveedores), {
    ...datos,
    activo: true,
    creadoEn: Timestamp.now(),
    actualizadoPor: usuario.uid,
  });
  registrarEnBitacora(cambios, usuario, 'Proveedor creado', datos.nombre);
  guardarEnSegundoPlano(cambios, `crear proveedor ${datos.nombre}`);
}

export function editarProveedor(proveedor: Proveedor, datos: DatosProveedor, usuario: Usuario) {
  const cambios = writeBatch(db);
  cambios.update(doc(coleccionProveedores, proveedor.id), { ...datos, actualizadoPor: usuario.uid });
  registrarEnBitacora(cambios, usuario, 'Proveedor editado', datos.nombre);
  guardarEnSegundoPlano(cambios, `editar proveedor ${datos.nombre}`);
}

export function cambiarEstadoProveedor(proveedor: Proveedor, activo: boolean, usuario: Usuario) {
  const cambios = writeBatch(db);
  cambios.update(doc(coleccionProveedores, proveedor.id), { activo, actualizadoPor: usuario.uid });
  registrarEnBitacora(cambios, usuario, activo ? 'Proveedor activado' : 'Proveedor desactivado', proveedor.nombre);
  guardarEnSegundoPlano(cambios, `${activo ? 'activar' : 'desactivar'} proveedor`);
}
