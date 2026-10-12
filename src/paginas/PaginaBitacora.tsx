// ============================================================
// PÁGINA: BITÁCORA (solo administrador)
// Registro de quién hizo cada cambio y cuándo. No se puede editar
// ni borrar (lo garantizan las reglas de seguridad).
// ============================================================
import { useState } from 'react';
import { claseInput, claseTarjeta, claseTituloSeccion } from '../componentes/estilos';
import { formatoFechaHora, normalizarTexto } from '../logica/formato';
import { useBitacora } from '../hooks/useDatos';

const ICONOS: Record<string, string> = {
  Venta: '💵',
  'Producto creado': '➕',
  'Producto editado': '✏️',
  'Producto eliminado': '🗑️',
  Reabastecimiento: '📦',
  'Usuario creado': '👤',
  'Rol cambiado': '🔑',
  'Usuario activado': '✅',
  'Usuario desactivado': '⛔',
};

export default function PaginaBitacora() {
  const { datos: registros, cargando, error } = useBitacora(300);
  const [busqueda, setBusqueda] = useState('');

  const texto = normalizarTexto(busqueda);
  const visibles = registros.filter(
    (r) =>
      normalizarTexto(r.accion).includes(texto) ||
      normalizarTexto(r.detalle).includes(texto) ||
      normalizarTexto(r.usuarioNombre).includes(texto),
  );

  return (
    <div className="space-y-4">
      <input
        type="search"
        placeholder="🔍 Buscar por acción, producto o usuario…"
        className={claseInput}
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      <div className={claseTarjeta}>
        <h2 className={claseTituloSeccion}>Últimos movimientos ({visibles.length})</h2>
        {cargando && <p className="text-sm text-slate-400">Cargando…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="divide-y divide-slate-100">
          {visibles.map((r) => (
            <div key={r.id} className="flex gap-3 py-2.5">
              <span className="text-lg">{ICONOS[r.accion] ?? '•'}</span>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2">
                  <span className="text-sm font-bold text-slate-700">{r.accion}</span>
                  <span className="shrink-0 font-mono text-[11px] text-slate-400">{formatoFechaHora(r.fecha)}</span>
                </div>
                <p className="break-words text-xs text-slate-600">{r.detalle}</p>
                <p className="text-[11px] text-slate-400">por {r.usuarioNombre}</p>
              </div>
            </div>
          ))}
          {!cargando && visibles.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">Sin movimientos registrados.</p>
          )}
        </div>
      </div>
    </div>
  );
}
