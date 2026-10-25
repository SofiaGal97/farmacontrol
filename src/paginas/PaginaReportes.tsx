// ============================================================
// PÁGINA: REPORTES (solo administrador)
// - Ventas: por periodo, con anulación y comprobante de cada venta.
// - Inventario: existencias, valor y alertas por lote.
// - Kardex: todos los movimientos de unidades en un periodo.
// Todos se pueden descargar en PDF y en Excel.
// ============================================================
import { useState, type FormEvent } from 'react';
import Campo from '../componentes/Campo';
import Icono from '../componentes/Icono';
import { InsigniaVencimiento } from '../componentes/InsigniasAlerta';
import Modal from '../componentes/Modal';
import { claseBotonPrincipal, claseBotonSecundario, claseInput, claseTarjeta, claseTituloSeccion } from '../componentes/estilos';
import type { Lote, TipoMovimiento, Venta } from '../modelos/tipos';
import { fechaATexto, formatoFechaHora, formatoFechaTexto, formatoQuetzales } from '../logica/formato';
import {
  NOMBRE_MOVIMIENTO,
  NOMBRE_PERIODO,
  rangoDePeriodo,
  resumirInventario,
  resumirVentas,
  type Periodo,
} from '../logica/reportes';
import {
  descargarComprobante,
  descargarReporteInventario,
  descargarReporteMovimientos,
  descargarReporteVentas,
} from '../servicios/reportesPdf';
import { exportarInventarioExcel, exportarMovimientosExcel, exportarVentasExcel } from '../servicios/reportesExcel';
import { anularVenta } from '../servicios/ventas';
import { mostrarAviso } from '../servicios/avisos';
import { useLotes, useMovimientosDePeriodo, useProductos, useVentas } from '../hooks/useDatos';
import { usePerfil } from '../hooks/useSesion';

type Reporte = 'ventas' | 'inventario' | 'kardex';
const NOMBRE_REPORTE: Record<Reporte, string> = { ventas: 'Ventas', inventario: 'Inventario', kardex: 'Kardex' };

export default function PaginaReportes() {
  const [reporte, setReporte] = useState<Reporte>('ventas');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200 p-1">
        {(Object.keys(NOMBRE_REPORTE) as Reporte[]).map((r) => (
          <button
            key={r}
            onClick={() => setReporte(r)}
            className={`rounded-lg py-2 text-sm font-bold ${reporte === r ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}
          >
            {NOMBRE_REPORTE[r]}
          </button>
        ))}
      </div>

      {reporte === 'ventas' && <ReporteVentas />}
      {reporte === 'inventario' && <ReporteInventario />}
      {reporte === 'kardex' && <ReporteKardex />}
    </div>
  );
}

// ------------------------------------------------------------
// Selector de periodo (compartido por Ventas y Kardex)
// ------------------------------------------------------------
function usePeriodo() {
  const hoyTexto = fechaATexto(new Date());
  const [periodo, setPeriodo] = useState<Periodo>('hoy');
  const [desdeTexto, setDesdeTexto] = useState(hoyTexto);
  const [hastaTexto, setHastaTexto] = useState(hoyTexto);
  const rango = rangoDePeriodo(periodo, desdeTexto, hastaTexto);
  // "hasta" no está incluido; para mostrarlo restamos un día
  const hastaIncluido = new Date(rango.hasta.getFullYear(), rango.hasta.getMonth(), rango.hasta.getDate() - 1);
  return { periodo, setPeriodo, desdeTexto, setDesdeTexto, hastaTexto, setHastaTexto, rango, hastaIncluido };
}

function SelectorPeriodo({ estado }: { estado: ReturnType<typeof usePeriodo> }) {
  return (
    <div className={claseTarjeta}>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(NOMBRE_PERIODO) as Periodo[]).map((p) => (
          <button
            key={p}
            onClick={() => estado.setPeriodo(p)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              estado.periodo === p ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {NOMBRE_PERIODO[p]}
          </button>
        ))}
      </div>
      {estado.periodo === 'personalizado' && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Campo etiqueta="Desde">
            <input type="date" className={claseInput} value={estado.desdeTexto} onChange={(e) => estado.setDesdeTexto(e.target.value)} />
          </Campo>
          <Campo etiqueta="Hasta">
            <input type="date" className={claseInput} value={estado.hastaTexto} onChange={(e) => estado.setHastaTexto(e.target.value)} />
          </Campo>
        </div>
      )}
    </div>
  );
}

/** Botones de descarga PDF y Excel */
function BotonesDescarga({ deshabilitado, onPdf, onExcel }: { deshabilitado: boolean; onPdf: () => void; onExcel: () => Promise<void> | void }) {
  const [generando, setGenerando] = useState(false);

  const manejarExcel = async () => {
    setGenerando(true);
    try {
      await onExcel();
    } catch (error) {
      console.error(error);
      mostrarAviso('No se pudo generar el Excel. Si es la primera vez, conéctate a internet e intenta de nuevo.', 'error');
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <button onClick={onPdf} disabled={deshabilitado} className={claseBotonPrincipal}>
        <span className="inline-flex items-center justify-center gap-2">
          <Icono nombre="descargar" /> PDF
        </span>
      </button>
      <button
        onClick={manejarExcel}
        disabled={deshabilitado || generando}
        className="w-full rounded-xl bg-emerald-600 p-3 font-bold text-white shadow-md transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
      >
        <span className="inline-flex items-center justify-center gap-2">
          <Icono nombre="excel" /> {generando ? 'Generando…' : 'Excel'}
        </span>
      </button>
    </div>
  );
}

// ------------------------------------------------------------
// Reporte de ventas
// ------------------------------------------------------------
function ReporteVentas() {
  const periodo = usePeriodo();
  const { datos: ventas, cargando, error } = useVentas(periodo.rango.desde, periodo.rango.hasta);
  const resumen = resumirVentas(ventas);
  const [ventaAAnular, setVentaAAnular] = useState<Venta | null>(null);

  return (
    <div className="space-y-4">
      <SelectorPeriodo estado={periodo} />

      <div className="grid grid-cols-2 gap-3">
        <Indicador titulo="Ingresos" valor={formatoQuetzales(resumen.ingresos)} color="blue" />
        <Indicador
          titulo="Ganancia neta"
          valor={formatoQuetzales(resumen.ganancia)}
          detalle={resumen.ingresos > 0 ? `Rentabilidad ${((resumen.ganancia / resumen.ingresos) * 100).toFixed(0)}%` : undefined}
          color="green"
        />
        <Indicador titulo="Ventas" valor={String(resumen.cantidadVentas)} detalle={resumen.anuladas > 0 ? `${resumen.anuladas} anulada(s)` : undefined} color="slate" />
        <Indicador titulo="Unidades vendidas" valor={String(resumen.unidadesVendidas)} color="slate" />
      </div>

      <BotonesDescarga
        deshabilitado={ventas.length === 0}
        onPdf={() => descargarReporteVentas(ventas, resumen, periodo.rango.desde, periodo.hastaIncluido)}
        onExcel={() => exportarVentasExcel(ventas, periodo.rango.desde)}
      />

      {resumen.masVendidos.length > 0 && (
        <div className={claseTarjeta}>
          <h3 className={claseTituloSeccion}>Más vendidos</h3>
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
        <div className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto">
          {ventas.map((venta) => (
            <div key={venta.id} className={`py-2.5 ${venta.anulada ? 'opacity-60' : ''}`}>
              <div className="flex justify-between gap-2">
                <span className="text-xs font-bold text-slate-600">
                  {venta.numero}
                  {venta.anulada && <span className="ml-1.5 rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700">ANULADA</span>}
                </span>
                <span className={`text-sm font-black ${venta.anulada ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                  {formatoQuetzales(venta.total)}
                </span>
              </div>
              <p className="text-xs text-slate-600">{venta.items.map((i) => `${i.cantidad}x ${i.nombre}`).join(', ')}</p>
              <p className="text-[11px] text-slate-400">
                {formatoFechaHora(venta.fecha)} · {venta.vendedorNombre}
                {!venta.anulada && <span className="text-green-600"> · Ganancia {formatoQuetzales(venta.ganancia)}</span>}
              </p>
              {venta.anulada && (
                <p className="text-[11px] text-red-600">
                  Anulada por {venta.anuladaPorNombre}: {venta.motivoAnulacion}
                </p>
              )}
              <div className="mt-1.5 flex gap-2">
                <button
                  onClick={() => descargarComprobante(venta)}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                >
                  <Icono nombre="recibo" className="h-3.5 w-3.5" /> Comprobante
                </button>
                {!venta.anulada && (
                  <button
                    onClick={() => setVentaAAnular(venta)}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600"
                  >
                    <Icono nombre="anular" className="h-3.5 w-3.5" /> Anular
                  </button>
                )}
              </div>
            </div>
          ))}
          {!cargando && ventas.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No hay ventas en este periodo.</p>}
        </div>
      </div>

      {ventaAAnular && <ModalAnularVenta venta={ventaAAnular} onCerrar={() => setVentaAAnular(null)} />}
    </div>
  );
}

function ModalAnularVenta({ venta, onCerrar }: { venta: Venta; onCerrar: () => void }) {
  const perfil = usePerfil();
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  const manejarAnular = (e: FormEvent) => {
    e.preventDefault();
    if (motivo.trim().length < 5) return setError('Escribe el motivo de la anulación (mínimo 5 letras).');
    anularVenta(venta, motivo.trim(), perfil);
    mostrarAviso(`Venta ${venta.numero} anulada. Las unidades regresaron al inventario.`);
    onCerrar();
  };

  return (
    <Modal titulo="Anular venta" onCerrar={onCerrar}>
      <form onSubmit={manejarAnular} className="space-y-4">
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-bold text-slate-700">
            {venta.numero} · {formatoQuetzales(venta.total)}
          </p>
          <p className="text-xs text-slate-500">{venta.items.map((i) => `${i.cantidad}x ${i.nombre}`).join(', ')}</p>
        </div>
        <p className="text-xs text-slate-500">
          Las unidades regresarán a sus lotes y la venta dejará de sumar en los reportes. Esta acción no se puede deshacer.
        </p>
        <Campo etiqueta="Motivo" obligatorio>
          <input
            className={claseInput}
            placeholder="Ej. Se cobró un producto equivocado" maxLength={200}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </Campo>
        {error && <p className="rounded-lg bg-red-50 p-2.5 text-sm font-medium text-red-700">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onCerrar} className={claseBotonSecundario}>
            Cancelar
          </button>
          <button type="submit" className="w-full rounded-xl bg-red-600 p-3 font-bold text-white shadow-md active:scale-[0.98]">
            Anular venta
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ------------------------------------------------------------
// Reporte de inventario
// ------------------------------------------------------------
function ReporteInventario() {
  const { datos: productos, cargando } = useProductos();
  const { datos: lotes } = useLotes();
  const resumen = resumirInventario(productos, lotes);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Indicador titulo="Productos" valor={String(resumen.totalProductos)} color="slate" />
        <Indicador titulo="Unidades" valor={String(resumen.totalUnidades)} color="slate" />
        <Indicador titulo="Valor a costo" valor={formatoQuetzales(resumen.valorCosto)} color="blue" />
        <Indicador titulo="Valor a venta" valor={formatoQuetzales(resumen.valorVenta)} color="green" />
      </div>

      <BotonesDescarga
        deshabilitado={productos.length === 0}
        onPdf={() => descargarReporteInventario(productos, lotes, resumen)}
        onExcel={() => exportarInventarioExcel(productos, lotes)}
      />

      {cargando && <p className="text-center text-sm text-slate-400">Cargando…</p>}

      <ListaLotes titulo="Lotes vencidos (dar de baja)" lotes={resumen.alertas.vencidos} />
      <ListaLotes titulo="Lotes por vencer (próximos 3 meses)" lotes={resumen.alertas.porVencer} />

      <div className={claseTarjeta}>
        <h3 className={claseTituloSeccion}>Stock bajo o agotado ({resumen.alertas.stockBajo.length})</h3>
        {resumen.alertas.stockBajo.length === 0 ? (
          <p className="text-sm text-slate-400">Sin alertas</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {resumen.alertas.stockBajo.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 py-2">
                <p className="truncate text-sm font-semibold text-slate-700">{p.nombre}</p>
                <span className={`shrink-0 text-xs font-bold ${p.stock <= 0 ? 'text-red-600' : 'text-amber-600'}`}>
                  {p.stock} u. (mín. {p.stockMinimo})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ListaLotes({ titulo, lotes }: { titulo: string; lotes: Lote[] }) {
  return (
    <div className={claseTarjeta}>
      <h3 className={claseTituloSeccion}>
        {titulo} ({lotes.length})
      </h3>
      {lotes.length === 0 ? (
        <p className="text-sm text-slate-400">Sin alertas</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {lotes.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-700">{l.productoNombre}</p>
                <p className="text-[11px] text-slate-400">
                  Lote {l.numeroLote} · {l.cantidad} u. · Vence {formatoFechaTexto(l.vencimiento)}
                </p>
              </div>
              <InsigniaVencimiento vencimiento={l.vencimiento} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Reporte de kardex (movimientos)
// ------------------------------------------------------------
function ReporteKardex() {
  const periodo = usePeriodo();
  const { datos: movimientos, cargando, error } = useMovimientosDePeriodo(periodo.rango.desde, periodo.rango.hasta);
  const [tipo, setTipo] = useState<TipoMovimiento | 'todos'>('todos');
  const visibles = tipo === 'todos' ? movimientos : movimientos.filter((m) => m.tipo === tipo);

  const totalPorTipo = (t: TipoMovimiento) => movimientos.filter((m) => m.tipo === t).reduce((s, m) => s + m.cantidad, 0);

  return (
    <div className="space-y-4">
      <SelectorPeriodo estado={periodo} />

      <div className="grid grid-cols-2 gap-3">
        <Indicador titulo="Unidades que entraron" valor={`+${totalPorTipo('entrada')}`} color="green" />
        <Indicador titulo="Unidades vendidas" valor={String(Math.abs(totalPorTipo('venta') + totalPorTipo('anulacion')))} color="blue" />
        <Indicador titulo="Bajas" valor={String(Math.abs(totalPorTipo('baja')))} color="slate" />
        <Indicador titulo="Ajustes (neto)" valor={String(totalPorTipo('ajuste'))} color="slate" />
      </div>

      <BotonesDescarga
        deshabilitado={visibles.length === 0}
        onPdf={() => descargarReporteMovimientos(visibles, periodo.rango.desde, periodo.hastaIncluido)}
        onExcel={() => exportarMovimientosExcel(visibles, periodo.rango.desde)}
      />

      <div className={claseTarjeta}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className={`${claseTituloSeccion} mb-0`}>Movimientos ({visibles.length})</h3>
          <select
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoMovimiento | 'todos')}
          >
            <option value="todos">Todos</option>
            {(Object.keys(NOMBRE_MOVIMIENTO) as TipoMovimiento[]).map((t) => (
              <option key={t} value={t}>
                {NOMBRE_MOVIMIENTO[t]}
              </option>
            ))}
          </select>
        </div>
        {cargando && <p className="text-sm text-slate-400">Cargando…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto">
          {visibles.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-700">
                  {NOMBRE_MOVIMIENTO[m.tipo]} · {m.productoNombre}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {formatoFechaHora(m.fecha)} · Lote {m.numeroLote} · {m.usuarioNombre}
                  {m.detalle && <> · {m.detalle}</>}
                </p>
              </div>
              <span className={`shrink-0 text-sm font-black ${m.cantidad >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
              </span>
            </div>
          ))}
          {!cargando && visibles.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Sin movimientos en este periodo.</p>}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Tarjeta de indicador
// ------------------------------------------------------------
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
