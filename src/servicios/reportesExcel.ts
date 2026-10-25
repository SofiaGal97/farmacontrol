// ============================================================
// SERVICIO DE REPORTES EN EXCEL (.xlsx)
// Usa la librería ExcelJS. Se carga solo cuando se necesita
// (import dinámico) para que la aplicación abra más rápido.
// ============================================================
import type { Lote, Movimiento, Producto, Proveedor, Usuario, Venta } from '../modelos/tipos';
import { diasParaVencer, estadoVencimiento, lotesDeProducto } from '../logica/alertas';
import { formatoFecha } from '../logica/formato';
import { NOMBRE_MOVIMIENTO } from '../logica/reportes';

interface Columna {
  titulo: string;
  ancho: number;
  formato?: string; // ej. '"Q"#,##0.00' para dinero
}

interface Hoja {
  nombre: string;
  columnas: Columna[];
  filas: (string | number | Date)[][];
}

const FORMATO_QUETZALES = '"Q"#,##0.00';
const FORMATO_FECHA = 'dd/mm/yyyy hh:mm';

/** Crea el archivo de Excel con una o varias hojas y lo descarga */
async function descargarExcel(nombreArchivo: string, hojas: Hoja[]) {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  libro.creator = 'FarmaControl';
  libro.created = new Date();

  for (const hoja of hojas) {
    const ws = libro.addWorksheet(hoja.nombre);
    ws.columns = hoja.columnas.map((c) => ({ header: c.titulo, width: c.ancho, style: c.formato ? { numFmt: c.formato } : {} }));
    ws.addRows(hoja.filas);

    // Encabezado en negrita con fondo azul, fijo al bajar
    const encabezado = ws.getRow(1);
    encabezado.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    encabezado.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: hoja.columnas.length } };
  }

  const contenido = await libro.xlsx.writeBuffer();
  const archivo = new Blob([contenido], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(archivo);
  enlace.download = `${nombreArchivo}.xlsx`;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 5000);
}

const fechaArchivo = (fecha: Date) => formatoFecha(fecha).replace(/\//g, '-');

/** Excel guarda las fechas sin zona horaria: corregimos para que muestre la hora de Guatemala */
const fechaExcel = (fecha: Date) => new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000);

// ---------------- Inventario ----------------

export function exportarInventarioExcel(productos: Producto[], lotes: Lote[]) {
  const todosLosLotes = productos.flatMap((p) => lotesDeProducto(p, lotes));
  todosLosLotes.sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));

  return descargarExcel(`inventario_${fechaArchivo(new Date())}`, [
    {
      nombre: 'Productos',
      columnas: [
        { titulo: 'Producto', ancho: 28 },
        { titulo: 'Componente activo', ancho: 22 },
        { titulo: 'Presentación', ancho: 20 },
        { titulo: 'Laboratorio', ancho: 18 },
        { titulo: 'Tipo', ancho: 10 },
        { titulo: 'Código', ancho: 14 },
        { titulo: 'Existencia', ancho: 11 },
        { titulo: 'Stock mínimo', ancho: 12 },
        { titulo: 'Precio costo', ancho: 13, formato: FORMATO_QUETZALES },
        { titulo: 'Precio público', ancho: 13, formato: FORMATO_QUETZALES },
        { titulo: 'Valor a costo', ancho: 14, formato: FORMATO_QUETZALES },
      ],
      filas: productos.map((p) => [
        p.nombre,
        p.componenteActivo,
        p.presentacion,
        p.laboratorio,
        p.tipo === 'Etico' ? 'Ético' : 'Genérico',
        p.codigo,
        p.stock,
        p.stockMinimo,
        p.precioCosto,
        p.precioVenta,
        Math.max(p.stock, 0) * p.precioCosto,
      ]),
    },
    {
      nombre: 'Lotes',
      columnas: [
        { titulo: 'Producto', ancho: 28 },
        { titulo: 'Lote', ancho: 14 },
        { titulo: 'Unidades', ancho: 10 },
        { titulo: 'Vencimiento', ancho: 13 },
        { titulo: 'Días para vencer', ancho: 15 },
        { titulo: 'Estado', ancho: 12 },
        { titulo: 'Proveedor', ancho: 22 },
      ],
      filas: todosLosLotes.map((l) => {
        const estado = estadoVencimiento(l.vencimiento);
        return [
          l.productoNombre,
          l.numeroLote,
          l.cantidad,
          l.vencimiento.split('-').reverse().join('/'),
          diasParaVencer(l.vencimiento),
          estado === 'vencido' ? 'VENCIDO' : estado === 'por_vencer' ? 'Por vencer' : 'Vigente',
          l.proveedorNombre,
        ];
      }),
    },
  ]);
}

// ---------------- Ventas ----------------

export function exportarVentasExcel(ventas: Venta[], desde: Date) {
  return descargarExcel(`ventas_${fechaArchivo(desde)}`, [
    {
      nombre: 'Ventas',
      columnas: [
        { titulo: 'No.', ancho: 18 },
        { titulo: 'Fecha', ancho: 17, formato: FORMATO_FECHA },
        { titulo: 'Vendedor', ancho: 20 },
        { titulo: 'Productos', ancho: 45 },
        { titulo: 'Total', ancho: 12, formato: FORMATO_QUETZALES },
        { titulo: 'Ganancia', ancho: 12, formato: FORMATO_QUETZALES },
        { titulo: 'Estado', ancho: 12 },
        { titulo: 'Motivo de anulación', ancho: 30 },
      ],
      filas: ventas.map((v) => [
        v.numero,
        fechaExcel(v.fecha),
        v.vendedorNombre,
        v.items.map((i) => `${i.cantidad}x ${i.nombre}`).join(', '),
        v.total,
        v.ganancia,
        v.anulada ? 'ANULADA' : 'Válida',
        v.motivoAnulacion ?? '',
      ]),
    },
    {
      nombre: 'Detalle',
      columnas: [
        { titulo: 'No. venta', ancho: 18 },
        { titulo: 'Fecha', ancho: 17, formato: FORMATO_FECHA },
        { titulo: 'Producto', ancho: 28 },
        { titulo: 'Cantidad', ancho: 10 },
        { titulo: 'Precio', ancho: 12, formato: FORMATO_QUETZALES },
        { titulo: 'Subtotal', ancho: 12, formato: FORMATO_QUETZALES },
        { titulo: 'Lotes', ancho: 25 },
        { titulo: 'Estado', ancho: 12 },
      ],
      filas: ventas.flatMap((v) =>
        v.items.map((i) => [
          v.numero,
          fechaExcel(v.fecha),
          i.nombre,
          i.cantidad,
          i.precioVenta,
          i.subtotal,
          i.lotes.map((l) => `${l.numeroLote} (${l.cantidad})`).join(', '),
          v.anulada ? 'ANULADA' : 'Válida',
        ]),
      ),
    },
  ]);
}

// ---------------- Kardex ----------------

export function exportarMovimientosExcel(movimientos: Movimiento[], desde: Date) {
  return descargarExcel(`kardex_${fechaArchivo(desde)}`, [
    {
      nombre: 'Kardex',
      columnas: [
        { titulo: 'Fecha', ancho: 17, formato: FORMATO_FECHA },
        { titulo: 'Tipo', ancho: 11 },
        { titulo: 'Producto', ancho: 28 },
        { titulo: 'Lote', ancho: 14 },
        { titulo: 'Cantidad', ancho: 10 },
        { titulo: 'Detalle', ancho: 40 },
        { titulo: 'Usuario', ancho: 20 },
      ],
      filas: movimientos.map((m) => [
        fechaExcel(m.fecha),
        NOMBRE_MOVIMIENTO[m.tipo],
        m.productoNombre,
        m.numeroLote,
        m.cantidad,
        m.detalle,
        m.usuarioNombre,
      ]),
    },
  ]);
}

// ---------------- Respaldo completo ----------------

interface DatosRespaldo {
  productos: Producto[];
  lotes: Lote[];
  proveedores: Proveedor[];
  ventas: Venta[];
  movimientos: Movimiento[];
  usuarios: Usuario[];
}

/** Excel con TODA la información del sistema (copia de seguridad) */
export function exportarRespaldoExcel(datos: DatosRespaldo) {
  const fechaTexto = (fecha: Date) => fechaExcel(fecha);
  return descargarExcel(`respaldo_farmacontrol_${fechaArchivo(new Date())}`, [
    {
      nombre: 'Productos',
      columnas: [
        { titulo: 'ID', ancho: 22 },
        { titulo: 'Producto', ancho: 28 },
        { titulo: 'Componente', ancho: 22 },
        { titulo: 'Presentación', ancho: 20 },
        { titulo: 'Laboratorio', ancho: 18 },
        { titulo: 'Tipo', ancho: 10 },
        { titulo: 'Código', ancho: 14 },
        { titulo: 'Existencia', ancho: 11 },
        { titulo: 'Stock mínimo', ancho: 12 },
        { titulo: 'Precio costo', ancho: 13, formato: FORMATO_QUETZALES },
        { titulo: 'Precio público', ancho: 13, formato: FORMATO_QUETZALES },
        { titulo: 'Estado', ancho: 10 },
      ],
      filas: datos.productos.map((p) => [
        p.id, p.nombre, p.componenteActivo, p.presentacion, p.laboratorio, p.tipo === 'Etico' ? 'Ético' : 'Genérico',
        p.codigo, p.stock, p.stockMinimo, p.precioCosto, p.precioVenta, p.activo ? 'Activo' : 'Eliminado',
      ]),
    },
    {
      nombre: 'Lotes',
      columnas: [
        { titulo: 'ID', ancho: 22 },
        { titulo: 'Producto', ancho: 28 },
        { titulo: 'Lote', ancho: 14 },
        { titulo: 'Vencimiento', ancho: 13 },
        { titulo: 'Ingresaron', ancho: 11 },
        { titulo: 'Quedan', ancho: 10 },
        { titulo: 'Costo unitario', ancho: 13, formato: FORMATO_QUETZALES },
        { titulo: 'Proveedor', ancho: 22 },
        { titulo: 'Fecha de ingreso', ancho: 17, formato: FORMATO_FECHA },
      ],
      filas: datos.lotes.map((l) => [
        l.id, l.productoNombre, l.numeroLote, l.vencimiento.split('-').reverse().join('/'), l.cantidadInicial,
        l.cantidad, l.costoUnitario, l.proveedorNombre, fechaTexto(l.fechaIngreso),
      ]),
    },
    {
      nombre: 'Proveedores',
      columnas: [
        { titulo: 'Nombre', ancho: 28 },
        { titulo: 'Teléfono', ancho: 14 },
        { titulo: 'Contacto', ancho: 20 },
        { titulo: 'Dirección', ancho: 35 },
        { titulo: 'Estado', ancho: 10 },
      ],
      filas: datos.proveedores.map((p) => [p.nombre, p.telefono, p.contacto, p.direccion, p.activo ? 'Activo' : 'Inactivo']),
    },
    {
      nombre: 'Ventas',
      columnas: [
        { titulo: 'No.', ancho: 18 },
        { titulo: 'Fecha', ancho: 17, formato: FORMATO_FECHA },
        { titulo: 'Vendedor', ancho: 20 },
        { titulo: 'Productos', ancho: 45 },
        { titulo: 'Total', ancho: 12, formato: FORMATO_QUETZALES },
        { titulo: 'Ganancia', ancho: 12, formato: FORMATO_QUETZALES },
        { titulo: 'Estado', ancho: 12 },
        { titulo: 'Motivo de anulación', ancho: 30 },
      ],
      filas: datos.ventas.map((v) => [
        v.numero, fechaTexto(v.fecha), v.vendedorNombre, v.items.map((i) => `${i.cantidad}x ${i.nombre}`).join(', '),
        v.total, v.ganancia, v.anulada ? 'ANULADA' : 'Válida', v.motivoAnulacion ?? '',
      ]),
    },
    {
      nombre: 'Kardex',
      columnas: [
        { titulo: 'Fecha', ancho: 17, formato: FORMATO_FECHA },
        { titulo: 'Tipo', ancho: 11 },
        { titulo: 'Producto', ancho: 28 },
        { titulo: 'Lote', ancho: 14 },
        { titulo: 'Cantidad', ancho: 10 },
        { titulo: 'Detalle', ancho: 40 },
        { titulo: 'Usuario', ancho: 20 },
      ],
      filas: datos.movimientos.map((m) => [
        fechaTexto(m.fecha), NOMBRE_MOVIMIENTO[m.tipo], m.productoNombre, m.numeroLote, m.cantidad, m.detalle, m.usuarioNombre,
      ]),
    },
    {
      nombre: 'Usuarios',
      columnas: [
        { titulo: 'Nombre', ancho: 28 },
        { titulo: 'Usuario', ancho: 20 },
        { titulo: 'Rol', ancho: 14 },
        { titulo: 'Estado', ancho: 12 },
      ],
      // Nunca se exportan contraseñas: Firebase las guarda cifradas y nadie puede verlas
      filas: datos.usuarios.map((u) => [u.nombre, u.usuario ?? u.correo, u.rol === 'admin' ? 'Administrador' : 'Empleado', u.activo ? 'Activo' : 'Desactivado']),
    },
  ]);
}
