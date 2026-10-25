// ============================================================
// SERVICIO DE RESPALDO (copia de seguridad)
// El plan gratuito de Firebase no hace copias automáticas, así que
// el administrador puede descargar TODA la información en un Excel
// y guardarlo (recomendado: una vez por semana).
// ============================================================
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Producto, Proveedor, Usuario } from '../modelos/tipos';
import { aLote } from './lotes';
import { aMovimiento } from './movimientos';
import { aVenta } from './ventas';
import { exportarRespaldoExcel } from './reportesExcel';

/** Lee una colección completa (necesita internet para traer lo más reciente) */
async function leerTodo(nombre: string) {
  const resultado = await getDocs(collection(db, nombre));
  return resultado.docs;
}

/** Descarga un Excel con todas las colecciones del sistema */
export async function descargarRespaldoCompleto(): Promise<{ hojas: number; registros: number }> {
  const [productos, lotes, proveedores, ventas, movimientos, usuarios] = await Promise.all([
    leerTodo('productos'),
    leerTodo('lotes'),
    leerTodo('proveedores'),
    leerTodo('ventas'),
    leerTodo('movimientos'),
    leerTodo('usuarios'),
  ]);

  const datos = {
    productos: productos.map((d) => ({ presentacion: '', codigo: '', ...d.data(), id: d.id }) as Producto),
    lotes: lotes.map((d) => aLote(d.id, d.data())),
    proveedores: proveedores.map((d) => ({ ...d.data(), id: d.id }) as Proveedor),
    ventas: ventas.map((d) => aVenta(d.id, d.data())).sort((a, b) => b.fecha.getTime() - a.fecha.getTime()),
    movimientos: movimientos.map((d) => aMovimiento(d.id, d.data())).sort((a, b) => b.fecha.getTime() - a.fecha.getTime()),
    usuarios: usuarios.map((d) => ({ ...d.data(), uid: d.id }) as Usuario),
  };

  await exportarRespaldoExcel(datos);
  const registros = Object.values(datos).reduce((suma, lista) => suma + lista.length, 0);
  return { hojas: 6, registros };
}
