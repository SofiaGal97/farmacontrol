// ============================================================
// SERVICIO DE VENTAS (registrar, anular y consultar)
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
import type { ItemCarrito, ItemVenta, Lote, Producto, Usuario, Venta } from '../modelos/tipos';
import { asignarLotesFEFO, lotesDeProducto } from '../logica/alertas';
import { registrarEnBitacora } from './bitacora';
import { registrarMovimiento } from './movimientos';
import { guardarEnSegundoPlano } from './sincronizacion';

const coleccionVentas = collection(db, 'ventas');
const coleccionProductos = collection(db, 'productos');
const coleccionLotes = collection(db, 'lotes');

/** Número corto y legible para el comprobante, ej. "V-261024-7KQ2" */
function numeroDeVenta(idDocumento: string, fecha: Date): string {
  const dd = (n: number) => String(n).padStart(2, '0');
  const fechaCorta = `${String(fecha.getFullYear()).slice(2)}${dd(fecha.getMonth() + 1)}${dd(fecha.getDate())}`;
  return `V-${fechaCorta}-${idDocumento.slice(0, 4).toUpperCase()}`;
}

/** Los lotes "heredados" (productos antiguos) no existen como documento */
const esLoteReal = (loteId: string) => !loteId.startsWith('heredado-');

/**
 * Registra una venta. En UN SOLO PASO (todo o nada):
 *  1. Decide de qué lotes salen las unidades (regla FEFO).
 *  2. Descuenta el stock del producto y de cada lote (increment negativo).
 *  3. Guarda la venta, el kardex y la bitácora.
 * Funciona sin internet: se sube sola cuando vuelve la conexión.
 * Lanza un error si algún producto ya no tiene unidades vendibles.
 */
export function registrarVenta(carrito: ItemCarrito[], productos: Producto[], lotes: Lote[], usuario: Usuario): Venta {
  const items: ItemVenta[] = [];

  for (const item of carrito) {
    const producto = productos.find((p) => p.id === item.productoId);
    if (!producto) continue;
    const salidas = asignarLotesFEFO(lotesDeProducto(producto, lotes), item.cantidad);
    if (!salidas) throw new Error(`No hay suficientes unidades vigentes de ${producto.nombre}.`);

    items.push({
      productoId: producto.id,
      nombre: producto.nombre,
      cantidad: item.cantidad,
      precioVenta: producto.precioVenta,
      precioCosto: producto.precioCosto,
      subtotal: producto.precioVenta * item.cantidad,
      lotes: salidas,
    });
  }
  if (items.length === 0) throw new Error('La canasta está vacía.');

  const total = items.reduce((suma, i) => suma + i.subtotal, 0);
  const ganancia = items.reduce((suma, i) => suma + (i.precioVenta - i.precioCosto) * i.cantidad, 0);

  const refVenta = doc(coleccionVentas);
  const fecha = new Date();
  const numero = numeroDeVenta(refVenta.id, fecha);
  const marca = { actualizadoEn: Timestamp.now(), actualizadoPor: usuario.uid };
  const cambios = writeBatch(db);

  for (const item of items) {
    cambios.update(doc(coleccionProductos, item.productoId), { stock: increment(-item.cantidad), ...marca });

    for (const salida of item.lotes) {
      if (esLoteReal(salida.loteId)) {
        cambios.update(doc(coleccionLotes, salida.loteId), { cantidad: increment(-salida.cantidad), ...marca });
      }
      registrarMovimiento(cambios, usuario, {
        tipo: 'venta',
        productoId: item.productoId,
        productoNombre: item.nombre,
        loteId: esLoteReal(salida.loteId) ? salida.loteId : '',
        numeroLote: salida.numeroLote,
        cantidad: -salida.cantidad,
        detalle: `Venta ${numero}`,
        referencia: refVenta.id,
      });
    }
  }

  cambios.set(refVenta, {
    numero,
    fecha: Timestamp.fromDate(fecha),
    items,
    total,
    ganancia,
    vendedorUid: usuario.uid,
    vendedorNombre: usuario.nombre,
    anulada: false,
  });

  const resumen = items.map((i) => `${i.cantidad}x ${i.nombre}`).join(', ');
  registrarEnBitacora(cambios, usuario, 'Venta', `${numero} — Q ${total.toFixed(2)} — ${resumen}`);

  guardarEnSegundoPlano(cambios, `venta ${numero}`);

  return {
    id: refVenta.id,
    numero,
    fecha,
    items,
    total,
    ganancia,
    vendedorUid: usuario.uid,
    vendedorNombre: usuario.nombre,
    anulada: false,
  };
}

/**
 * Anula una venta (solo administrador): las unidades regresan a sus
 * lotes, se marca la venta como anulada y queda en kardex y bitácora.
 */
export function anularVenta(venta: Venta, motivo: string, usuario: Usuario) {
  const marca = { actualizadoEn: Timestamp.now(), actualizadoPor: usuario.uid };
  const cambios = writeBatch(db);

  cambios.update(doc(coleccionVentas, venta.id), {
    anulada: true,
    motivoAnulacion: motivo,
    anuladaPor: usuario.uid,
    anuladaPorNombre: usuario.nombre,
    fechaAnulacion: Timestamp.now(),
  });

  for (const item of venta.items) {
    cambios.update(doc(coleccionProductos, item.productoId), { stock: increment(item.cantidad), ...marca });

    // Ventas antiguas (sin lotes) devuelven todo como un solo movimiento
    const salidas = item.lotes.length > 0 ? item.lotes : [{ loteId: '', numeroLote: '-', cantidad: item.cantidad }];

    for (const salida of salidas) {
      if (salida.loteId && esLoteReal(salida.loteId)) {
        cambios.update(doc(coleccionLotes, salida.loteId), { cantidad: increment(salida.cantidad), ...marca });
      }
      registrarMovimiento(cambios, usuario, {
        tipo: 'anulacion',
        productoId: item.productoId,
        productoNombre: item.nombre,
        loteId: esLoteReal(salida.loteId) ? salida.loteId : '',
        numeroLote: salida.numeroLote,
        cantidad: salida.cantidad,
        detalle: `Anulación de ${venta.numero}: ${motivo}`,
        referencia: venta.id,
      });
    }
  }

  registrarEnBitacora(cambios, usuario, 'Venta anulada', `${venta.numero} — Q ${venta.total.toFixed(2)} — Motivo: ${motivo}`);
  guardarEnSegundoPlano(cambios, `anular venta ${venta.numero}`);
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
            numero: datos.numero ?? `V-${d.id.slice(0, 6).toUpperCase()}`,
            fecha: (datos.fecha as Timestamp).toDate(),
            items: (datos.items as ItemVenta[]).map((i) => ({ ...i, lotes: i.lotes ?? [] })),
            total: datos.total,
            ganancia: datos.ganancia,
            vendedorUid: datos.vendedorUid,
            vendedorNombre: datos.vendedorNombre,
            anulada: datos.anulada === true,
            motivoAnulacion: datos.motivoAnulacion,
            anuladaPorNombre: datos.anuladaPorNombre,
            fechaAnulacion: datos.fechaAnulacion ? (datos.fechaAnulacion as Timestamp).toDate() : undefined,
          };
        }),
      );
    },
    alFallar,
  );
}
