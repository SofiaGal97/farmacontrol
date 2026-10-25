// ============================================================
// PÁGINA: DETALLE DE UN PRODUCTO
// Muestra sus lotes (con vencimiento y proveedor), permite registrar
// entradas, ajustar lotes y ver el KARDEX (historial de movimientos).
// ============================================================
import { useState } from 'react';
import Icono from '../componentes/Icono';
import InsigniasAlerta, { InsigniaVencimiento } from '../componentes/InsigniasAlerta';
import ModalAjusteLote from '../componentes/ModalAjusteLote';
import ModalEntrada from '../componentes/ModalEntrada';
import { claseBotonPrincipal, claseTarjeta, claseTituloSeccion } from '../componentes/estilos';
import type { Lote, Producto } from '../modelos/tipos';
import { lotesDeProducto, unidadesVendibles } from '../logica/alertas';
import { formatoFecha, formatoFechaHora, formatoFechaTexto, formatoQuetzales } from '../logica/formato';
import { NOMBRE_MOVIMIENTO } from '../logica/reportes';
import { useMovimientosDeProducto } from '../hooks/useDatos';
import { usePerfil } from '../hooks/useSesion';

interface Props {
  producto: Producto;
  lotes: Lote[];
  onVolver: () => void;
  onEditar: () => void;
  onEliminar: () => void;
}

export default function PaginaDetalleProducto({ producto, lotes, onVolver, onEditar, onEliminar }: Props) {
  const perfil = usePerfil();
  const esAdmin = perfil.rol === 'admin';
  const [registrandoEntrada, setRegistrandoEntrada] = useState(false);
  const [loteAAjustar, setLoteAAjustar] = useState<Lote | null>(null);

  const lotesDelProducto = lotesDeProducto(producto, lotes);
  const vendibles = unidadesVendibles(lotesDelProducto);

  return (
    <div className="space-y-4">
      <button onClick={onVolver} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600">
        <Icono nombre="volver" className="h-4 w-4" /> Volver al inventario
      </button>

      {/* Datos generales */}
      <div className={claseTarjeta}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-800">{producto.nombre}</h2>
            <p className="text-sm text-slate-500">
              {[producto.componenteActivo, producto.presentacion].filter(Boolean).join(' · ') || 'Sin descripción'}
            </p>
            <p className="text-xs text-slate-400">
              Lab: {producto.laboratorio} · {producto.tipo === 'Generico' ? 'Genérico' : 'Ético'}
              {producto.codigo && <> · Código: {producto.codigo}</>}
            </p>
          </div>
          <div className="text-right">
            <span className="block text-2xl font-black text-slate-800">{producto.stock}</span>
            <span className="text-[11px] text-slate-400">unidades</span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <Dato titulo="Precio público" valor={formatoQuetzales(producto.precioVenta)} />
          {esAdmin && <Dato titulo="Costo" valor={formatoQuetzales(producto.precioCosto)} />}
          <Dato titulo="Mínimo" valor={`${producto.stockMinimo} u.`} />
          {!esAdmin && <Dato titulo="Vendibles" valor={`${vendibles} u.`} />}
        </div>

        <div className="mt-3">
          <InsigniasAlerta producto={producto} lotesDelProducto={lotesDelProducto} />
        </div>
      </div>

      <button onClick={() => setRegistrandoEntrada(true)} className={claseBotonPrincipal}>
        <span className="inline-flex items-center justify-center gap-2">
          <Icono nombre="camion" /> Entrada de mercadería
        </span>
      </button>

      {/* Lotes */}
      <div className={claseTarjeta}>
        <h3 className={claseTituloSeccion}>Lotes con existencias ({lotesDelProducto.length})</h3>
        {lotesDelProducto.length === 0 && <p className="text-sm text-slate-400">No hay unidades en existencia.</p>}
        <div className="divide-y divide-slate-100">
          {lotesDelProducto.map((lote) => (
            <div key={lote.id} className="flex items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700">
                  Lote {lote.numeroLote} · <span className="font-black">{lote.cantidad} u.</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  Vence {formatoFechaTexto(lote.vencimiento)}
                  {!lote.esHeredado && <> · Ingresó {formatoFecha(lote.fechaIngreso)}</>}
                  {lote.proveedorNombre && <> · {lote.proveedorNombre}</>}
                </p>
                <div className="mt-1">
                  <InsigniaVencimiento vencimiento={lote.vencimiento} />
                </div>
              </div>
              {esAdmin && (
                <button
                  onClick={() => setLoteAAjustar(lote)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600"
                >
                  <Icono nombre="ajuste" className="h-4 w-4" /> Ajustar
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {esAdmin && <Kardex productoId={producto.id} />}

      {esAdmin && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onEditar}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600"
          >
            <Icono nombre="editar" className="h-4 w-4" /> Editar datos
          </button>
          <button
            onClick={onEliminar}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-100 bg-white py-2.5 text-sm font-semibold text-red-600"
          >
            <Icono nombre="basura" className="h-4 w-4" /> Eliminar
          </button>
        </div>
      )}

      {registrandoEntrada && <ModalEntrada producto={producto} onCerrar={() => setRegistrandoEntrada(false)} />}
      {loteAAjustar && <ModalAjusteLote producto={producto} lote={loteAAjustar} onCerrar={() => setLoteAAjustar(null)} />}
    </div>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <span className="block text-[10px] font-bold uppercase text-slate-400">{titulo}</span>
      <span className="font-bold text-slate-700">{valor}</span>
    </div>
  );
}

/** Historial de movimientos (entradas, ventas, anulaciones, bajas y ajustes) */
function Kardex({ productoId }: { productoId: string }) {
  const { datos: movimientos, cargando, error } = useMovimientosDeProducto(productoId);

  return (
    <div className={claseTarjeta}>
      <h3 className={`${claseTituloSeccion} flex items-center gap-1.5`}>
        <Icono nombre="historial" className="h-4 w-4" /> Kardex (historial de movimientos)
      </h3>
      {cargando && <p className="text-sm text-slate-400">Cargando…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!cargando && movimientos.length === 0 && <p className="text-sm text-slate-400">Sin movimientos registrados.</p>}
      <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
        {movimientos.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700">
                {NOMBRE_MOVIMIENTO[m.tipo]} · Lote {m.numeroLote}
              </p>
              <p className="truncate text-[11px] text-slate-400">
                {formatoFechaHora(m.fecha)} · {m.usuarioNombre}
                {m.detalle && <> · {m.detalle}</>}
              </p>
            </div>
            <span className={`shrink-0 text-sm font-black ${m.cantidad >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
