// ============================================================
// SERVICIO DE MOVIMIENTOS (KARDEX)
// Cada entrada o salida de unidades queda registrada aquí, dentro
// del mismo lote de cambios que la provoca (o se guardan los dos,
// o ninguno). No se puede editar ni borrar.
// ============================================================
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  type DocumentData,
  type Unsubscribe,
  type WriteBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Movimiento, Usuario } from '../modelos/tipos';

const coleccionMovimientos = collection(db, 'movimientos');

export type NuevoMovimiento = Omit<Movimiento, 'id' | 'fecha' | 'usuarioUid' | 'usuarioNombre'>;

/** Agrega un movimiento al lote de cambios que se está preparando */
export function registrarMovimiento(cambios: WriteBatch, usuario: Usuario, movimiento: NuevoMovimiento) {
  cambios.set(doc(coleccionMovimientos), {
    ...movimiento,
    fecha: Timestamp.now(),
    usuarioUid: usuario.uid,
    usuarioNombre: usuario.nombre,
  });
}

function aMovimiento(id: string, datos: DocumentData): Movimiento {
  return {
    id,
    fecha: (datos.fecha as Timestamp).toDate(),
    tipo: datos.tipo,
    productoId: datos.productoId,
    productoNombre: datos.productoNombre,
    loteId: datos.loteId,
    numeroLote: datos.numeroLote,
    cantidad: datos.cantidad,
    detalle: datos.detalle,
    referencia: datos.referencia,
    usuarioUid: datos.usuarioUid,
    usuarioNombre: datos.usuarioNombre,
  };
}

/** Kardex de UN producto (del más reciente al más antiguo) */
export function escucharMovimientosDeProducto(
  productoId: string,
  alRecibir: (movimientos: Movimiento[]) => void,
  alFallar: (error: Error) => void,
): Unsubscribe {
  // Filtramos solo por producto y ordenamos aquí para no necesitar índices extra
  const consulta = query(coleccionMovimientos, where('productoId', '==', productoId));
  return onSnapshot(
    consulta,
    (resultado) => {
      const movimientos = resultado.docs.map((d) => aMovimiento(d.id, d.data()));
      movimientos.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
      alRecibir(movimientos);
    },
    alFallar,
  );
}

/** Todos los movimientos de un rango de fechas (para reportes) */
export function escucharMovimientosDePeriodo(
  desde: Date,
  hasta: Date,
  alRecibir: (movimientos: Movimiento[]) => void,
  alFallar: (error: Error) => void,
): Unsubscribe {
  const consulta = query(
    coleccionMovimientos,
    where('fecha', '>=', Timestamp.fromDate(desde)),
    where('fecha', '<', Timestamp.fromDate(hasta)),
    orderBy('fecha', 'desc'),
  );
  return onSnapshot(consulta, (resultado) => alRecibir(resultado.docs.map((d) => aMovimiento(d.id, d.data()))), alFallar);
}
