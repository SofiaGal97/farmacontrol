// ============================================================
// CAPA DE LÓGICA DE NEGOCIO: ALERTAS
// Reglas puras (no tocan la base de datos): reciben datos y
// devuelven un resultado. Así es fácil entenderlas y probarlas.
// ============================================================
import type { Producto } from '../modelos/tipos';

/** Se avisa cuando faltan 3 meses (90 días) o menos para que venza */
export const DIAS_ALERTA_VENCIMIENTO = 90;

export type EstadoVencimiento = 'vencido' | 'por_vencer' | 'vigente';
export type EstadoStock = 'agotado' | 'bajo' | 'normal';

/** Convierte "AAAA-MM-DD" a una fecha local (sin problemas de zona horaria) */
function fechaDesdeTexto(fechaTexto: string): Date {
  const [anio, mes, dia] = fechaTexto.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

/** Días que faltan para el vencimiento (negativo = ya venció) */
export function diasParaVencer(fechaVencimiento: string, hoy: Date = new Date()): number {
  const vencimiento = fechaDesdeTexto(fechaVencimiento);
  const inicioDeHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  return Math.round((vencimiento.getTime() - inicioDeHoy.getTime()) / MS_POR_DIA);
}

/** ¿Está vencido, por vencer (≤ 90 días) o vigente? */
export function estadoVencimiento(producto: Producto, hoy: Date = new Date()): EstadoVencimiento {
  const dias = diasParaVencer(producto.vencimiento, hoy);
  if (dias < 0) return 'vencido';
  if (dias <= DIAS_ALERTA_VENCIMIENTO) return 'por_vencer';
  return 'vigente';
}

/** ¿Está agotado, bajo (≤ stock mínimo) o normal? */
export function estadoStock(producto: Producto): EstadoStock {
  if (producto.stock <= 0) return 'agotado';
  if (producto.stock <= producto.stockMinimo) return 'bajo';
  return 'normal';
}

export interface ResumenAlertas {
  stockBajo: Producto[]; // incluye agotados
  porVencer: Producto[];
  vencidos: Producto[];
}

/** Agrupa los productos según la alerta que tengan */
export function resumirAlertas(productos: Producto[], hoy: Date = new Date()): ResumenAlertas {
  const resumen: ResumenAlertas = { stockBajo: [], porVencer: [], vencidos: [] };

  for (const producto of productos) {
    if (estadoStock(producto) !== 'normal') resumen.stockBajo.push(producto);

    const vencimiento = estadoVencimiento(producto, hoy);
    if (vencimiento === 'vencido') resumen.vencidos.push(producto);
    if (vencimiento === 'por_vencer') resumen.porVencer.push(producto);
  }

  // Los que vencen primero aparecen arriba
  const porFecha = (a: Producto, b: Producto) => a.vencimiento.localeCompare(b.vencimiento);
  resumen.porVencer.sort(porFecha);
  resumen.vencidos.sort(porFecha);
  resumen.stockBajo.sort((a, b) => a.stock - b.stock);

  return resumen;
}

/** Se puede vender solo si hay existencias y no está vencido */
export function puedeVenderse(producto: Producto, hoy: Date = new Date()): boolean {
  return producto.stock > 0 && estadoVencimiento(producto, hoy) !== 'vencido';
}
