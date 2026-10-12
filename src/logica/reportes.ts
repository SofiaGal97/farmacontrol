// ============================================================
// CAPA DE LÓGICA: CÁLCULOS DE LOS REPORTES
// ============================================================
import type { Producto, Venta } from '../modelos/tipos';
import { resumirAlertas, type ResumenAlertas } from './alertas';

// ---------- Periodos de tiempo ----------

export type Periodo = 'hoy' | 'semana' | 'mes' | 'personalizado';

export interface Rango {
  desde: Date; // incluido
  hasta: Date; // NO incluido (inicio del día siguiente)
}

const inicioDelDia = (fecha: Date) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
const sumarDias = (fecha: Date, dias: number) =>
  new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias);

/** Calcula las fechas de inicio y fin de un periodo */
export function rangoDePeriodo(periodo: Periodo, desdeTexto = '', hastaTexto = ''): Rango {
  const hoy = inicioDelDia(new Date());
  const manana = sumarDias(hoy, 1);

  switch (periodo) {
    case 'hoy':
      return { desde: hoy, hasta: manana };
    case 'semana':
      return { desde: sumarDias(hoy, -6), hasta: manana };
    case 'mes':
      return { desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1), hasta: manana };
    case 'personalizado': {
      const [a1, m1, d1] = (desdeTexto || '').split('-').map(Number);
      const [a2, m2, d2] = (hastaTexto || '').split('-').map(Number);
      const desde = a1 ? new Date(a1, m1 - 1, d1) : hoy;
      const hasta = a2 ? new Date(a2, m2 - 1, d2 + 1) : manana;
      return { desde, hasta };
    }
  }
}

export const NOMBRE_PERIODO: Record<Periodo, string> = {
  hoy: 'Hoy',
  semana: 'Últimos 7 días',
  mes: 'Este mes',
  personalizado: 'Personalizado',
};

// ---------- Ventas ----------

export interface ProductoMasVendido {
  nombre: string;
  unidades: number;
  total: number;
}

export interface ResumenVentas {
  cantidadVentas: number;
  unidadesVendidas: number;
  ingresos: number;
  ganancia: number;
  masVendidos: ProductoMasVendido[];
}

export function resumirVentas(ventas: Venta[]): ResumenVentas {
  const porProducto = new Map<string, ProductoMasVendido>();
  let ingresos = 0;
  let ganancia = 0;
  let unidadesVendidas = 0;

  for (const venta of ventas) {
    ingresos += venta.total;
    ganancia += venta.ganancia;
    for (const item of venta.items) {
      unidadesVendidas += item.cantidad;
      const actual = porProducto.get(item.productoId) ?? { nombre: item.nombre, unidades: 0, total: 0 };
      actual.unidades += item.cantidad;
      actual.total += item.subtotal;
      porProducto.set(item.productoId, actual);
    }
  }

  const masVendidos = [...porProducto.values()].sort((a, b) => b.unidades - a.unidades).slice(0, 5);

  return { cantidadVentas: ventas.length, unidadesVendidas, ingresos, ganancia, masVendidos };
}

// ---------- Inventario ----------

export interface ResumenInventario {
  totalProductos: number;
  totalUnidades: number;
  valorCosto: number; // cuánto costó todo lo que hay en bodega
  valorVenta: number; // cuánto se ganaría si se vende todo
  alertas: ResumenAlertas;
}

export function resumirInventario(productos: Producto[]): ResumenInventario {
  let totalUnidades = 0;
  let valorCosto = 0;
  let valorVenta = 0;

  for (const p of productos) {
    const unidades = Math.max(p.stock, 0);
    totalUnidades += unidades;
    valorCosto += unidades * p.precioCosto;
    valorVenta += unidades * p.precioVenta;
  }

  return {
    totalProductos: productos.length,
    totalUnidades,
    valorCosto,
    valorVenta,
    alertas: resumirAlertas(productos),
  };
}
