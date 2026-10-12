// ============================================================
// SERVICIO DE BITÁCORA (auditoría: quién hizo qué y cuándo)
// ============================================================
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  type Unsubscribe,
  type WriteBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { RegistroBitacora, Usuario } from '../modelos/tipos';

const coleccionBitacora = collection(db, 'bitacora');

/**
 * Agrega un registro a la bitácora DENTRO del mismo lote que el cambio.
 * Así nunca queda un cambio sin su registro (o se guardan los dos, o ninguno).
 */
export function registrarEnBitacora(lote: WriteBatch, usuario: Usuario, accion: string, detalle: string) {
  lote.set(doc(coleccionBitacora), {
    fecha: Timestamp.now(),
    usuarioUid: usuario.uid,
    usuarioNombre: usuario.nombre,
    accion,
    detalle,
  });
}

/** Escucha los últimos registros (solo administradores) */
export function escucharBitacora(
  cantidad: number,
  alRecibir: (registros: RegistroBitacora[]) => void,
  alFallar: (error: Error) => void,
): Unsubscribe {
  const consulta = query(coleccionBitacora, orderBy('fecha', 'desc'), limit(cantidad));

  return onSnapshot(
    consulta,
    (resultado) => {
      alRecibir(
        resultado.docs.map((d) => {
          const datos = d.data();
          return {
            id: d.id,
            fecha: (datos.fecha as Timestamp).toDate(),
            usuarioUid: datos.usuarioUid,
            usuarioNombre: datos.usuarioNombre,
            accion: datos.accion,
            detalle: datos.detalle,
          };
        }),
      );
    },
    alFallar,
  );
}
