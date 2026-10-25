// ============================================================
// SERVICIO DE LOTES (entradas de mercadería, ajustes y bajas)
// ============================================================
import {
  collection,
  doc,
  increment,
  onSnapshot,
  query,
  Timestamp,
  where,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
  type WriteBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { DatosEntrada, Lote, Producto, Usuario } from '../modelos/tipos';
import { registrarEnBitacora } from './bitacora';
import { registrarMovimiento } from './movimientos';
import { guardarEnSegundoPlano } from './sincronizacion';

const coleccionLotes = collection(db, 'lotes');
const coleccionProductos = collection(db, 'productos');

/** Convierte un documento de Firestore en un Lote */
export function aLote(id: string, datos: DocumentData): Lote {
  return {
    id,
    productoId: datos.productoId,
    productoNombre: datos.productoNombre,
    numeroLote: datos.numeroLote,
    vencimiento: datos.vencimiento,
    cantidadInicial: datos.cantidadInicial,
    cantidad: datos.cantidad,
    costoUnitario: datos.costoUnitario,
    proveedorId: datos.proveedorId,
    proveedorNombre: datos.proveedorNombre,
    fechaIngreso: (datos.fechaIngreso as Timestamp).toDate(),
  };
}

/** Escucha los lotes que todavía tienen unidades */
export function escucharLotes(alRecibir: (lotes: Lote[]) => void, alFallar: (error: Error) => void): Unsubscribe {
  const consulta = query(coleccionLotes, where('cantidad', '>', 0));
  return onSnapshot(
    consulta,
    (resultado) => {
      alRecibir(resultado.docs.map((d) => aLote(d.id, d.data())));
    },
    alFallar,
  );
}

/**
 * Prepara (sin guardar todavía) un lote nuevo con su movimiento de
 * kardex y su registro en bitácora. Lo usan "crear producto" y
 * "registrar entrada" para que todo se guarde en un solo paso.
 */
export function prepararEntrada(
  cambios: WriteBatch,
  producto: { id: string; nombre: string },
  entrada: DatosEntrada,
  usuario: Usuario,
) {
  const refLote = doc(coleccionLotes);
  cambios.set(refLote, {
    productoId: producto.id,
    productoNombre: producto.nombre,
    numeroLote: entrada.numeroLote,
    vencimiento: entrada.vencimiento,
    cantidadInicial: entrada.cantidad,
    cantidad: entrada.cantidad,
    costoUnitario: entrada.costoUnitario,
    proveedorId: entrada.proveedorId,
    proveedorNombre: entrada.proveedorNombre,
    fechaIngreso: Timestamp.now(),
    creadoPor: usuario.uid,
  });

  registrarMovimiento(cambios, usuario, {
    tipo: 'entrada',
    productoId: producto.id,
    productoNombre: producto.nombre,
    loteId: refLote.id,
    numeroLote: entrada.numeroLote,
    cantidad: entrada.cantidad,
    detalle: entrada.proveedorNombre ? `Proveedor: ${entrada.proveedorNombre}` : 'Sin proveedor',
    referencia: '',
  });

  registrarEnBitacora(
    cambios,
    usuario,
    'Entrada de mercadería',
    `${producto.nombre}: +${entrada.cantidad} u., lote ${entrada.numeroLote}, vence ${entrada.vencimiento}` +
      (entrada.proveedorNombre ? `, proveedor ${entrada.proveedorNombre}` : ''),
  );
}

/** Registra la llegada de mercadería de un producto que ya existe */
export function registrarEntrada(producto: Producto, entrada: DatosEntrada, usuario: Usuario) {
  const cambios = writeBatch(db);
  prepararEntrada(cambios, producto, entrada, usuario);
  // increment(): Firestore SUMA en la nube; dos celulares sin internet no se "pisan"
  cambios.update(doc(coleccionProductos, producto.id), {
    stock: increment(entrada.cantidad),
    actualizadoEn: Timestamp.now(),
    actualizadoPor: usuario.uid,
  });
  guardarEnSegundoPlano(cambios, `entrada de ${producto.nombre}`);
}

export const MOTIVOS_AJUSTE = ['Vencido', 'Dañado', 'Conteo físico', 'Otro'] as const;
export type MotivoAjuste = (typeof MOTIVOS_AJUSTE)[number];

/**
 * Corrige las unidades de un lote (solo administrador).
 * - "Vencido" o "Dañado" se registra como BAJA (producto desechado).
 * - "Conteo físico" u "Otro" se registra como AJUSTE.
 */
export function ajustarLote(
  producto: Producto,
  lote: Lote,
  nuevaCantidad: number,
  motivo: MotivoAjuste,
  observacion: string,
  usuario: Usuario,
) {
  const diferencia = nuevaCantidad - lote.cantidad;
  if (diferencia === 0) return;

  const cambios = writeBatch(db);
  const marca = { actualizadoEn: Timestamp.now(), actualizadoPor: usuario.uid };

  if (!lote.esHeredado) {
    cambios.update(doc(coleccionLotes, lote.id), { cantidad: increment(diferencia), ...marca });
  }
  cambios.update(doc(coleccionProductos, producto.id), { stock: increment(diferencia), ...marca });

  const esBaja = motivo === 'Vencido' || motivo === 'Dañado';
  const detalle = `${motivo}${observacion ? `: ${observacion}` : ''}`;

  registrarMovimiento(cambios, usuario, {
    tipo: esBaja ? 'baja' : 'ajuste',
    productoId: producto.id,
    productoNombre: producto.nombre,
    loteId: lote.esHeredado ? '' : lote.id,
    numeroLote: lote.numeroLote,
    cantidad: diferencia,
    detalle,
    referencia: '',
  });

  registrarEnBitacora(
    cambios,
    usuario,
    esBaja ? 'Baja de producto' : 'Ajuste de inventario',
    `${producto.nombre}, lote ${lote.numeroLote}: ${lote.cantidad} → ${nuevaCantidad} u. (${detalle})`,
  );

  guardarEnSegundoPlano(cambios, `ajuste de ${producto.nombre}`);
}
