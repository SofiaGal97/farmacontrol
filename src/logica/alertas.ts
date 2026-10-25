// ============================================================
// CAPA DE LÓGICA DE NEGOCIO: LOTES, ALERTAS Y FEFO
// Reglas puras (no tocan la base de datos): reciben datos y
// devuelven un resultado. Así es fácil entenderlas y probarlas.
// ============================================================
import type { Lote, Producto, SalidaLote } from '../modelos/tipos';

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

/** ¿La fecha ya pasó, está a 90 días o menos, o está vigente? */
export function estadoVencimiento(fechaVencimiento: string, hoy: Date = new Date()): EstadoVencimiento {
  const dias = diasParaVencer(fechaVencimiento, hoy);
  if (dias < 0) return 'vencido';
  if (dias <= DIAS_ALERTA_VENCIMIENTO) return 'por_vencer';
  return 'vigente';
}

/** ¿El producto está agotado, bajo (≤ stock mínimo) o normal? */
export function estadoStock(producto: Producto): EstadoStock {
  if (producto.stock <= 0) return 'agotado';
  if (producto.stock <= producto.stockMinimo) return 'bajo';
  return 'normal';
}

// ------------------------------------------------------------
// Lotes
// ------------------------------------------------------------

const porVencimiento = (a: Lote, b: Lote) => a.vencimiento.localeCompare(b.vencimiento);

/**
 * Lotes con existencias de un producto, ordenados del que vence
 * primero al que vence último. Si el producto es antiguo (creado
 * antes de usar lotes) se arma un "lote heredado" con sus datos.
 */
export function lotesDeProducto(producto: Producto, lotes: Lote[]): Lote[] {
  const propios = lotes.filter((l) => l.productoId === producto.id && l.cantidad > 0).sort(porVencimiento);
  if (propios.length > 0 || !producto.vencimiento || producto.stock <= 0) return propios;

  return [
    {
      id: `heredado-${producto.id}`,
      productoId: producto.id,
      productoNombre: producto.nombre,
      numeroLote: 'Inicial',
      vencimiento: producto.vencimiento,
      cantidadInicial: producto.stock,
      cantidad: producto.stock,
      costoUnitario: producto.precioCosto,
      proveedorId: '',
      proveedorNombre: '',
      fechaIngreso: new Date(0),
      esHeredado: true,
    },
  ];
}

/** Fecha de vencimiento más próxima entre los lotes con existencias */
export function proximoVencimiento(lotesDelProducto: Lote[]): string | null {
  return lotesDelProducto.length > 0 ? lotesDelProducto[0].vencimiento : null;
}

/** Unidades que SÍ se pueden vender (las de lotes no vencidos) */
export function unidadesVendibles(lotesDelProducto: Lote[], hoy: Date = new Date()): number {
  return lotesDelProducto
    .filter((l) => estadoVencimiento(l.vencimiento, hoy) !== 'vencido')
    .reduce((suma, l) => suma + l.cantidad, 0);
}

/**
 * Regla FEFO ("First Expired, First Out" = lo primero que vence, sale primero).
 * Reparte la cantidad vendida entre los lotes NO vencidos, empezando
 * por el de vencimiento más cercano. Devuelve null si no alcanza.
 */
export function asignarLotesFEFO(lotesDelProducto: Lote[], cantidad: number, hoy: Date = new Date()): SalidaLote[] | null {
  const salidas: SalidaLote[] = [];
  let faltan = cantidad;

  for (const lote of lotesDelProducto) {
    if (faltan <= 0) break;
    if (estadoVencimiento(lote.vencimiento, hoy) === 'vencido') continue;
    const tomar = Math.min(lote.cantidad, faltan);
    if (tomar <= 0) continue;
    salidas.push({ loteId: lote.id, numeroLote: lote.numeroLote, cantidad: tomar });
    faltan -= tomar;
  }

  return faltan > 0 ? null : salidas;
}

// ------------------------------------------------------------
// Resumen de alertas
// ------------------------------------------------------------

export interface ResumenAlertas {
  stockBajo: Producto[]; // incluye agotados
  porVencer: Lote[]; // lotes que vencen en 90 días o menos
  vencidos: Lote[]; // lotes vencidos que aún tienen unidades
}

/** Agrupa productos y lotes según la alerta que tengan */
export function resumirAlertas(productos: Producto[], lotes: Lote[], hoy: Date = new Date()): ResumenAlertas {
  const resumen: ResumenAlertas = { stockBajo: [], porVencer: [], vencidos: [] };

  for (const producto of productos) {
    if (estadoStock(producto) !== 'normal') resumen.stockBajo.push(producto);

    for (const lote of lotesDeProducto(producto, lotes)) {
      const estado = estadoVencimiento(lote.vencimiento, hoy);
      if (estado === 'vencido') resumen.vencidos.push(lote);
      if (estado === 'por_vencer') resumen.porVencer.push(lote);
    }
  }

  resumen.stockBajo.sort((a, b) => a.stock - b.stock);
  resumen.porVencer.sort(porVencimiento);
  resumen.vencidos.sort(porVencimiento);
  return resumen;
}
