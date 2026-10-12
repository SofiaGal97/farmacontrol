// ============================================================
// PÁGINA: REPORTES (solo administrador)
// Dos reportes: Ventas (por periodo) e Inventario (estado actual).
// Ambos se pueden descargar en PDF.
// ============================================================
import { useState } from 'react';
import Campo from '../componentes/Campo';
import InsigniasAlerta from '../componentes/InsigniasAlerta';
import { claseBotonPrincipal, claseInput, claseTarjeta, claseTituloSeccion } from '../componentes/estilos';
import type { Producto } from '../modelos/tipos';
import { fechaATexto, formatoFechaHora, formatoFechaTexto, formatoQuetzales } from '../logica/formato';
import {
  NOMBRE_PERIODO,
  rangoDePeriodo,
  resumirInventario,
  resumirVentas,
  type Periodo,
} from '../logica/reportes';
import { descargarReporteInventario, descargarReporteVentas } from '../servicios/reportesPdf';
import { useProductos, useVentas } from '../hooks/useDatos';

type Reporte = 'ventas' | 'inventario';

export default function PaginaReportes() {
  const [reporte, setReporte] = useState<Reporte>('ventas');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200 p-1">
        {(['ventas', 'inventario'] as Reporte[]).map((r) => (
          <button
            key={r}
            onClick={() => setReporte(r)}
            className={`rounded-lg py-2 text-sm font-bold ${reporte === r ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}
          >
            {r === 'ventas' ? '💵 Ventas' : '📦 Inventario'}
          </button>
        ))}
      </div>

      {reporte === 'ventas' ? <ReporteVentas /> : <ReporteInventario />}
    </div>
  );
}

// ------------------------------------------------------------
// Reporte de ventas
// ------------------------------------------------------------
function ReporteVentas() {
  const hoyTexto = fechaATexto(new Date());
  const [periodo, setPeriodo] = useState<Periodo>('hoy');
  const [desdeTexto, setDesdeTexto] = useState(hoyTexto);
  const [hastaTexto, setHastaTexto] = useState(hoyTexto);

  const rango = rangoDePeriodo(periodo, desdeTexto, hastaTexto);
  const { datos: ventas, cargando, error } = useVentas(rango.desde, rango.hasta);
  const resumen = resumirVentas(ventas);

  // "hasta" no está incluido; para mostrarlo restamos un día
  const hastaIncluido = new Date(rango.hasta.getFullYear(), rango.hasta.getMonth(), rango.hasta.getDate() - 1);

  return (
    <div className="space-y-4">
      {/* Selector de periodo */}
      <div className={claseTarjeta}>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(NOMBRE_PERIODO) as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                periodo === p ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {NOMBRE_PERIODO[p]}
            </button>
          ))}
        </div>
        {periodo === 'personalizado' && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Campo etiqueta="Desde">
              <input type="date" className={claseInput} value={desdeTexto} onChange={(e) => setDesdeTexto(e.target.value)} />
            </Campo>
            <Campo etiqueta="Hasta">
              <input type="date" className={claseInput} value={hastaTexto} onChange={(e) => setHastaTexto(e.target.value)} />
            </Campo>
          </div>
        )}
      </div>

      {/* Totales */}
      <div className="grid grid-cols-2 gap-3">
        <Indicador titulo="Ingresos" valor={formatoQuetzales(resumen.ingresos)} color="blue" />
        <Indicador
          titulo="Ganancia neta"
          valor={formatoQuetzales(resumen.ganancia)}
          detalle={
            resumen.ingresos > 0 ? `Rentabilidad ${((resumen.ganancia / resumen.ingresos) * 100).toFixed(0)}%` : undefined
          }
          color="green"
        />
        <Indicador titulo="Ventas" valor={String(resumen.cantidadVentas)} color="slate" />
        <Indicador titulo="Unidades vendidas" valor={String(resumen.unidadesVendidas)} color="slate" />
      </div>

      <button
        onClick={() => descargarReporteVentas(ventas, resumen, rango.desde, hastaIncluido)}
        disabled={ventas.length === 0}
        className={claseBotonPrincipal}
      >
        📄 Descargar reporte de ventas (PDF)
      </button>

      {resumen.masVendidos.length > 0 && (
        <div className={claseTarjeta}>
          <h3 className={claseTituloSeccion}>🏆 Más vendidos</h3>
          {resumen.masVendidos.map((p, i) => (
            <div key={p.nombre} className="flex justify-between py-1 text-sm">
              <span>
                {i + 1}. {p.nombre}
              </span>
              <span className="font-semibold text-slate-600">{p.unidades} u.</span>
            </div>
          ))}
        </div>
      )}

      <div className={claseTarjeta}>
        <h3 className={claseTituloSeccion}>Historial ({ventas.length})</h3>
        {cargando && <p className="py-4 text-center text-sm text-slate-400">Cargando…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
          {ventas.map((venta) => (
            <div key={venta.id} className="py-2.5">
              <div className="flex justify-between">
                <span className="font-mono text-xs text-slate-400">{formatoFechaHora(venta.fecha)}</span>
                <span className="text-sm font-black text-slate-700">{formatoQuetzales(venta.total)}</span>
              </div>
              <p className="text-xs text-slate-600">{venta.items.map((i) => `${i.cantidad}x ${i.nombre}`).join(', ')}</p>
              <p className="text-[11px] text-slate-400">
                Vendió: {venta.vendedorNombre} · <span className="text-green-600">Ganancia {formatoQuetzales(venta.ganancia)}</span>
              </p>
            </div>
          ))}
          {!cargando && ventas.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">No hay ventas en este periodo.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Reporte de inventario
// ------------------------------------------------------------
function ReporteInventario() {
  const { datos: productos, cargando } = useProductos();
  const resumen = resumirInventario(productos);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Indicador titulo="Productos" valor={String(resumen.totalProductos)} color="slate" />
        <Indicador titulo="Unidades" valor={String(resumen.totalUnidades)} color="slate" />
        <Indicador titulo="Valor a costo" valor={formatoQuetzales(resumen.valorCosto)} color="blue" />
        <Indicador titulo="Valor a venta" valor={formatoQuetzales(resumen.valorVenta)} color="green" />
      </div>

      <button
        onClick={() => descargarReporteInventario(productos, resumen)}
        disabled={productos.length === 0}
        className={claseBotonPrincipal}
      >
        📄 Descargar reporte de inventario (PDF)
      </button>

      {cargando && <p className="text-center text-sm text-slate-400">Cargando…</p>}

      <ListaAlertas titulo="🔴 Vencidos" productos={resumen.alertas.vencidos} />
      <ListaAlertas titulo="🟠 Por vencer (próximos 3 meses)" productos={resumen.alertas.porVencer} />
      <ListaAlertas titulo="📉 Stock bajo o agotado" productos={resumen.alertas.stockBajo} />
    </div>
  );
}

function ListaAlertas({ titulo, productos }: { titulo: string; productos: Producto[] }) {
  return (
    <div className={claseTarjeta}>
      <h3 className={claseTituloSeccion}>
        {titulo} ({productos.length})
      </h3>
      {productos.length === 0 ? (
        <p className="text-sm text-slate-400">Sin alertas ✅</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {productos.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-700">{p.nombre}</p>
                <p className="text-[11px] text-slate-400">
                  Stock {p.stock} (mín. {p.stockMinimo}) · Vence {formatoFechaTexto(p.vencimiento)}
                </p>
              </div>
              <InsigniasAlerta producto={p} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const COLORES_INDICADOR = {
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  green: 'border-green-200 bg-green-50 text-green-700',
  slate: 'border-slate-200 bg-white text-slate-700',
};

function Indicador(props: { titulo: string; valor: string; detalle?: string; color: keyof typeof COLORES_INDICADOR }) {
  return (
    <div className={`rounded-2xl border p-3 text-center shadow-sm ${COLORES_INDICADOR[props.color]}`}>
      <span className="block text-[11px] font-bold uppercase tracking-wider opacity-80">{props.titulo}</span>
      <span className="block text-lg font-black">{props.valor}</span>
      {props.detalle && <span className="block text-[11px] font-medium">{props.detalle}</span>}
    </div>
  );
}
