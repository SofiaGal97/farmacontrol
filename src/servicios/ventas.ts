// ============================================================
// SERVICIO DE VENTAS
// ============================================================
import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ItemCarrito, ItemVenta, Producto, Usuario, Venta } from '../modelos/tipos';
import { registrarEnBitacora } from './bitacora';
import { guardarEnSegundoPlano } from './sincronizacion';

const coleccionVentas = collection(db, 'ventas');
const coleccionProductos = collection(db, 'productos');

/**
 * Registra una venta. En UN SOLO LOTE (todo o nada):
 *  1. Descuenta el stock de cada producto (con increment negativo).
 *  2. Guarda la venta con el detalle de productos.
 *  3. Deja el registro en la bitácora.
 * Funciona sin internet: se sube sola cuando vuelve la conexión.
 */
export function registrarVenta(
  carrito: ItemCarrito[],
  productos: Producto[],
  usuario: Usuario,
): { total: number; ganancia: number } {
  const items: ItemVenta[] = [];

  for (const item of carrito) {
    const producto = productos.find((p) => p.id === item.productoId);
    if (!producto) continue;
    items.push({
      productoId: producto.id,
      nombre: producto.nombre,
      cantidad: item.cantidad,
      precioVenta: producto.precioVenta,
      precioCosto: producto.precioCosto,
      subtotal: producto.precioVenta * item.cantidad,
    });
  }

  const total = items.reduce((suma, i) => suma + i.subtotal, 0);
  const ganancia = items.reduce((suma, i) => suma + (i.precioVenta - i.precioCosto) * i.cantidad, 0);

  const lote = writeBatch(db);

  for (const item of items) {
    lote.update(doc(coleccionProductos, item.productoId), {
      stock: increment(-item.cantidad),
      actualizadoEn: Timestamp.now(),
      actualizadoPor: usuario.uid,
    });
  }

  lote.set(doc(coleccionVentas), {
    fecha: Timestamp.now(),
    items,
    total,
    ganancia,
    vendedorUid: usuario.uid,
    vendedorNombre: usuario.nombre,
  });

  const resumen = items.map((i) => `${i.cantidad}x ${i.nombre}`).join(', ');
  registrarEnBitacora(lote, usuario, 'Venta', `Q ${total.toFixed(2)} — ${resumen}`);

  guardarEnSegundoPlano(lote, 'venta');
  return { total, ganancia };
}

/** Escucha las ventas de un rango de fechas (solo administrador) */
export function escucharVentas(
  desde: Date,
  hasta: Date,
  alRecibir: (ventas: Venta[]) => void,
  alFallar: (error: Error) => void,
): Unsubscribe {
  const consulta = query(
    coleccionVentas,
    where('fecha', '>=', Timestamp.fromDate(desde)),
    where('fecha', '<', Timestamp.fromDate(hasta)),
    orderBy('fecha', 'desc'),
  );

  return onSnapshot(
    consulta,
    (resultado) => {
      alRecibir(
        resultado.docs.map((d) => {
          const datos = d.data();
          return {
            id: d.id,
            fecha: (datos.fecha as Timestamp).toDate(),
            items: datos.items as ItemVenta[],
            total: datos.total,
            ganancia: datos.ganancia,
            vendedorUid: datos.vendedorUid,
            vendedorNombre: datos.vendedorNombre,
          };
        }),
      );
    },
    alFallar,
  );
}
