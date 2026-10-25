// ============================================================
// SERVICIO DE REPORTES EN PDF
// Se generan dentro del celular (funciona sin internet).
// ============================================================
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Lote, Movimiento, Producto, Venta } from '../modelos/tipos';
import { diasParaVencer, estadoStock, estadoVencimiento, lotesDeProducto, proximoVencimiento } from '../logica/alertas';
import { formatoFecha, formatoFechaHora, formatoFechaTexto, formatoQuetzales } from '../logica/formato';
import { NOMBRE_MOVIMIENTO, type ResumenInventario, type ResumenVentas } from '../logica/reportes';

const NOMBRE_FARMACIA = 'Farmacia "Regalo de Dios"';
const DIRECCION_FARMACIA = 'Casa #46, Zona 2, Colonia San Josecito, Retalhuleu';
const AZUL: [number, number, number] = [37, 99, 235];

/** Encabezado común de todos los reportes. Devuelve la altura donde sigue el contenido */
function dibujarEncabezado(pdf: jsPDF, titulo: string, subtitulo: string): number {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(30, 41, 59);
  pdf.text(`FarmaControl - ${titulo}`, 14, 18);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  pdf.text(NOMBRE_FARMACIA, 14, 25);
  pdf.text(subtitulo, 14, 30);
  pdf.text(`Generado: ${formatoFechaHora(new Date())}`, 14, 35);

  pdf.setDrawColor(226, 232, 240);
  pdf.line(14, 39, 196, 39);
  return 47;
}

/** Posición vertical donde terminó la última tabla */
const finDeTabla = (pdf: jsPDF) =>
  (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

// ---------------- Reporte de ventas ----------------

export function descargarReporteVentas(
  ventas: Venta[],
  resumen: ResumenVentas,
  desde: Date,
  hastaIncluido: Date,
) {
  const pdf = new jsPDF();
  const periodo = `Periodo: ${formatoFecha(desde)} al ${formatoFecha(hastaIncluido)}`;
  let y = dibujarEncabezado(pdf, 'Reporte de Ventas', periodo);

  pdf.setTextColor(30, 41, 59);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('RESUMEN', 14, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text(`Ventas realizadas: ${resumen.cantidadVentas}`, 14, (y += 7));
  pdf.text(`Unidades vendidas: ${resumen.unidadesVendidas}`, 14, (y += 6));
  pdf.text(`Ingresos totales: ${formatoQuetzales(resumen.ingresos)}`, 14, (y += 6));
  pdf.text(`Ganancia neta: ${formatoQuetzales(resumen.ganancia)}`, 14, (y += 6));
  if (resumen.anuladas > 0) pdf.text(`Ventas anuladas (no suman): ${resumen.anuladas}`, 14, (y += 6));

  autoTable(pdf, {
    startY: y + 8,
    head: [['No.', 'Fecha', 'Productos', 'Vendedor', 'Total', 'Ganancia']],
    body: ventas.map((v) => [
      v.anulada ? `${v.numero} (ANULADA)` : v.numero,
      formatoFechaHora(v.fecha),
      v.items.map((it) => `${it.cantidad}x ${it.nombre}`).join(', '),
      v.vendedorNombre,
      formatoQuetzales(v.total),
      formatoQuetzales(v.ganancia),
    ]),
    headStyles: { fillColor: AZUL },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 2: { cellWidth: 65 } },
  });

  if (resumen.masVendidos.length > 0) {
    autoTable(pdf, {
      startY: finDeTabla(pdf) + 10,
      head: [['Productos más vendidos', 'Unidades', 'Total vendido']],
      body: resumen.masVendidos.map((p) => [p.nombre, p.unidades, formatoQuetzales(p.total)]),
      headStyles: { fillColor: [22, 163, 74] },
      styles: { fontSize: 9 },
    });
  }

  pdf.save(`reporte_ventas_${formatoFecha(desde).replace(/\//g, '-')}.pdf`);
}

// ---------------- Reporte de inventario ----------------

function textoEstado(producto: Producto, lotesDelProducto: Lote[]): string {
  const estados: string[] = [];
  const stock = estadoStock(producto);
  if (stock === 'agotado') estados.push('AGOTADO');
  if (stock === 'bajo') estados.push('Stock bajo');
  const vencidas = lotesDelProducto
    .filter((l) => estadoVencimiento(l.vencimiento) === 'vencido')
    .reduce((suma, l) => suma + l.cantidad, 0);
  if (vencidas > 0) estados.push(`${vencidas} u. VENCIDAS`);
  const vigentes = lotesDelProducto.filter((l) => estadoVencimiento(l.vencimiento) !== 'vencido');
  const proximo = proximoVencimiento(vigentes);
  if (proximo && estadoVencimiento(proximo) === 'por_vencer') estados.push(`Vence en ${diasParaVencer(proximo)} días`);
  return estados.join(' / ') || 'OK';
}

/** Pinta de color la celda de estado según la alerta */
function colorearEstado(texto: string): [number, number, number] {
  if (texto.includes('VENCID') || texto.includes('AGOTADO')) return [220, 38, 38];
  if (texto !== 'OK' && texto !== 'Vigente') return [217, 119, 6];
  return [22, 163, 74];
}

export function descargarReporteInventario(productos: Producto[], lotes: Lote[], resumen: ResumenInventario) {
  const pdf = new jsPDF({ orientation: 'landscape' });
  let y = dibujarEncabezado(pdf, 'Reporte de Inventario', `Total de productos: ${resumen.totalProductos}`);

  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(11);
  pdf.text(`Unidades en existencia: ${resumen.totalUnidades}`, 14, y);
  pdf.text(`Valor a precio de costo: ${formatoQuetzales(resumen.valorCosto)}`, 14, (y += 6));
  pdf.text(`Valor a precio de venta: ${formatoQuetzales(resumen.valorVenta)}`, 14, (y += 6));
  pdf.text(
    `Alertas: Stock bajo: ${resumen.alertas.stockBajo.length} | Lotes por vencer (3 meses o menos): ${resumen.alertas.porVencer.length} | Lotes vencidos: ${resumen.alertas.vencidos.length}`,
    14,
    (y += 6),
  );

  // Tabla 1: productos (los que tienen alerta van primero)
  const filas = productos.map((p) => {
    const lotesDelProducto = lotesDeProducto(p, lotes);
    return { p, lotesDelProducto, estado: textoEstado(p, lotesDelProducto) };
  });
  filas.sort((a, b) => Number(a.estado === 'OK') - Number(b.estado === 'OK') || a.p.nombre.localeCompare(b.p.nombre, 'es'));

  autoTable(pdf, {
    startY: y + 8,
    head: [['Producto', 'Presentación', 'Laboratorio', 'Tipo', 'Stock', 'Mín.', 'Costo', 'Venta', 'Lotes', 'Estado']],
    body: filas.map(({ p, lotesDelProducto, estado }) => [
      p.nombre,
      p.presentacion || '-',
      p.laboratorio,
      p.tipo === 'Etico' ? 'Ético' : 'Genérico',
      p.stock,
      p.stockMinimo,
      formatoQuetzales(p.precioCosto),
      formatoQuetzales(p.precioVenta),
      lotesDelProducto.length,
      estado,
    ]),
    headStyles: { fillColor: AZUL },
    styles: { fontSize: 8, cellPadding: 2 },
    didParseCell: (celda) => {
      if (celda.section === 'body' && celda.column.index === 9) celda.cell.styles.textColor = colorearEstado(String(celda.cell.raw));
    },
  });

  // Tabla 2: detalle de lotes (ordenados por vencimiento)
  const todosLosLotes = productos.flatMap((p) => lotesDeProducto(p, lotes));
  todosLosLotes.sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));

  if (todosLosLotes.length > 0) {
    autoTable(pdf, {
      startY: finDeTabla(pdf) + 10,
      head: [['Producto', 'Lote', 'Unidades', 'Vence', 'Proveedor', 'Estado']],
      body: todosLosLotes.map((l) => {
        const estado = estadoVencimiento(l.vencimiento);
        return [
          l.productoNombre,
          l.numeroLote,
          l.cantidad,
          formatoFechaTexto(l.vencimiento),
          l.proveedorNombre || '-',
          estado === 'vencido' ? 'VENCIDO' : estado === 'por_vencer' ? `Vence en ${diasParaVencer(l.vencimiento)} días` : 'Vigente',
        ];
      }),
      headStyles: { fillColor: [71, 85, 105] },
      styles: { fontSize: 8, cellPadding: 2 },
      didParseCell: (celda) => {
        if (celda.section === 'body' && celda.column.index === 5) celda.cell.styles.textColor = colorearEstado(String(celda.cell.raw));
      },
    });
  }

  pdf.save(`reporte_inventario_${formatoFecha(new Date()).replace(/\//g, '-')}.pdf`);
}

// ---------------- Reporte de movimientos (kardex) ----------------

export function descargarReporteMovimientos(movimientos: Movimiento[], desde: Date, hastaIncluido: Date) {
  const pdf = new jsPDF({ orientation: 'landscape' });
  const y = dibujarEncabezado(
    pdf,
    'Kardex de Movimientos',
    `Periodo: ${formatoFecha(desde)} al ${formatoFecha(hastaIncluido)} | Movimientos: ${movimientos.length}`,
  );

  autoTable(pdf, {
    startY: y,
    head: [['Fecha', 'Tipo', 'Producto', 'Lote', 'Cantidad', 'Detalle', 'Usuario']],
    body: movimientos.map((m) => [
      formatoFechaHora(m.fecha),
      NOMBRE_MOVIMIENTO[m.tipo],
      m.productoNombre,
      m.numeroLote,
      m.cantidad > 0 ? `+${m.cantidad}` : String(m.cantidad),
      m.detalle,
      m.usuarioNombre,
    ]),
    headStyles: { fillColor: AZUL },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 5: { cellWidth: 70 } },
    didParseCell: (celda) => {
      if (celda.section === 'body' && celda.column.index === 4) {
        celda.cell.styles.textColor = String(celda.cell.raw).startsWith('+') ? [22, 163, 74] : [220, 38, 38];
      }
    },
  });

  pdf.save(`kardex_${formatoFecha(desde).replace(/\//g, '-')}.pdf`);
}

// ---------------- Comprobante de venta ----------------

/**
 * Comprobante tamaño ticket (80 mm de ancho) de una venta.
 * No sustituye a la factura electrónica (FEL) de la SAT.
 */
export function descargarComprobante(venta: Venta) {
  const ancho = 80;
  const alto = 95 + venta.items.length * 9;
  const pdf = new jsPDF({ unit: 'mm', format: [ancho, alto] });
  const centro = ancho / 2;
  let y = 10;

  pdf.setTextColor(30, 41, 59);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text(NOMBRE_FARMACIA, centro, y, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text(pdf.splitTextToSize(DIRECCION_FARMACIA, ancho - 10), centro, (y += 5), { align: 'center' });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('COMPROBANTE DE VENTA', centro, (y += 9), { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(`No. ${venta.numero}`, 5, (y += 6));
  pdf.text(`Fecha: ${formatoFechaHora(venta.fecha)}`, 5, (y += 4));
  pdf.text(`Atendió: ${venta.vendedorNombre}`, 5, (y += 4));
  if (venta.anulada) {
    pdf.setTextColor(220, 38, 38);
    pdf.setFont('helvetica', 'bold');
    pdf.text('VENTA ANULADA', 5, (y += 5));
    pdf.setTextColor(30, 41, 59);
    pdf.setFont('helvetica', 'normal');
  }

  autoTable(pdf, {
    startY: y + 3,
    margin: { left: 4, right: 4 },
    head: [['Cant.', 'Producto', 'P/U', 'Subtotal']],
    body: venta.items.map((i) => [i.cantidad, i.nombre, formatoQuetzales(i.precioVenta), formatoQuetzales(i.subtotal)]),
    theme: 'plain',
    headStyles: { fontStyle: 'bold', fontSize: 7 },
    styles: { fontSize: 7, cellPadding: 1 },
    columnStyles: { 0: { cellWidth: 9 }, 2: { cellWidth: 15, halign: 'right' }, 3: { cellWidth: 17, halign: 'right' } },
  });

  y = finDeTabla(pdf) + 3;
  pdf.setDrawColor(203, 213, 225);
  pdf.line(5, y, ancho - 5, y);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('TOTAL', 5, (y += 6));
  pdf.text(formatoQuetzales(venta.total), ancho - 5, y, { align: 'right' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  pdf.text('¡Gracias por su compra!', centro, (y += 9), { align: 'center' });
  pdf.text('Documento sin validez fiscal', centro, (y += 4), { align: 'center' });

  pdf.save(`comprobante_${venta.numero}.pdf`);
}
