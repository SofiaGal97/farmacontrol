// ============================================================
// SERVICIO DE REPORTES EN PDF
// Se generan dentro del celular (funciona sin internet).
// ============================================================
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Producto, Venta } from '../modelos/tipos';
import { diasParaVencer, estadoStock, estadoVencimiento } from '../logica/alertas';
import { formatoFecha, formatoFechaHora, formatoFechaTexto, formatoQuetzales } from '../logica/formato';
import type { ResumenInventario, ResumenVentas } from '../logica/reportes';

const NOMBRE_FARMACIA = 'Farmacia "Regalo de Dios"';
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

  autoTable(pdf, {
    startY: y + 8,
    head: [['#', 'Fecha', 'Productos', 'Vendedor', 'Total', 'Ganancia']],
    body: ventas.map((v, i) => [
      i + 1,
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

function textoEstado(producto: Producto): string {
  const estados: string[] = [];
  const stock = estadoStock(producto);
  if (stock === 'agotado') estados.push('AGOTADO');
  if (stock === 'bajo') estados.push('Stock bajo');
  const vencimiento = estadoVencimiento(producto);
  if (vencimiento === 'vencido') estados.push('VENCIDO');
  if (vencimiento === 'por_vencer') estados.push(`Vence en ${diasParaVencer(producto.vencimiento)} días`);
  return estados.join(' / ') || 'OK';
}

export function descargarReporteInventario(productos: Producto[], resumen: ResumenInventario) {
  const pdf = new jsPDF({ orientation: 'landscape' });
  let y = dibujarEncabezado(pdf, 'Reporte de Inventario', `Total de productos: ${resumen.totalProductos}`);

  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(11);
  pdf.text(`Unidades en existencia: ${resumen.totalUnidades}`, 14, y);
  pdf.text(`Valor a precio de costo: ${formatoQuetzales(resumen.valorCosto)}`, 14, (y += 6));
  pdf.text(`Valor a precio de venta: ${formatoQuetzales(resumen.valorVenta)}`, 14, (y += 6));
  pdf.text(
    `Alertas: Stock bajo: ${resumen.alertas.stockBajo.length} | Por vencer (3 meses o menos): ${resumen.alertas.porVencer.length} | Vencidos: ${resumen.alertas.vencidos.length}`,
    14,
    (y += 6),
  );

  // Los productos con alerta van primero
  const ordenados = [...productos].sort((a, b) => {
    const conAlerta = (p: Producto) => (textoEstado(p) === 'OK' ? 1 : 0);
    return conAlerta(a) - conAlerta(b) || a.nombre.localeCompare(b.nombre, 'es');
  });

  autoTable(pdf, {
    startY: y + 8,
    head: [['Producto', 'Componente', 'Laboratorio', 'Tipo', 'Stock', 'Mín.', 'Costo', 'Venta', 'Vence', 'Estado']],
    body: ordenados.map((p) => [
      p.nombre,
      p.componenteActivo || '-',
      p.laboratorio,
      p.tipo === 'Etico' ? 'Ético' : 'Genérico',
      p.stock,
      p.stockMinimo,
      formatoQuetzales(p.precioCosto),
      formatoQuetzales(p.precioVenta),
      formatoFechaTexto(p.vencimiento),
      textoEstado(p),
    ]),
    headStyles: { fillColor: AZUL },
    styles: { fontSize: 8, cellPadding: 2 },
    // Pinta de color la celda de estado según la alerta
    didParseCell: (celda) => {
      if (celda.section !== 'body' || celda.column.index !== 9) return;
      const texto = String(celda.cell.raw);
      if (texto.includes('VENCIDO') || texto.includes('AGOTADO')) celda.cell.styles.textColor = [220, 38, 38];
      else if (texto !== 'OK') celda.cell.styles.textColor = [217, 119, 6];
      else celda.cell.styles.textColor = [22, 163, 74];
    },
  });

  pdf.save(`reporte_inventario_${formatoFecha(new Date()).replace(/\//g, '-')}.pdf`);
}
