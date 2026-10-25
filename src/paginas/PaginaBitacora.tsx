// ============================================================
// PÁGINA: BITÁCORA (solo administrador)
// Registro de quién hizo cada cambio y cuándo. No se puede editar
// ni borrar (lo garantizan las reglas de seguridad).
// ============================================================
import { useState } from 'react';
import { claseInput, claseTarjeta, claseTituloSeccion } from '../componentes/estilos';
import { formatoFechaHora, normalizarTexto } from '../logica/formato';
import { useBitacora } from '../hooks/useDatos';
import Icono, { type NombreIcono } from '../componentes/Icono';

const ICONOS: Record<string, NombreIcono> = {
  Venta: 'dinero',
  'Venta anulada': 'anular',
  'Producto creado': 'mas',
  'Producto editado': 'editar',
  'Producto eliminado': 'basura',
  Reabastecimiento: 'paquete',
  'Entrada de mercadería': 'camion',
  'Baja de producto': 'basura',
  'Ajuste de inventario': 'ajuste',
  'Proveedor creado': 'camion',
  'Proveedor editado': 'camion',
  'Proveedor activado': 'activado',
  'Proveedor desactivado': 'bloqueado',
  'Usuario creado': 'usuarioMas',
  'Rol cambiado': 'llave',
  'Usuario activado': 'activado',
  'Usuario desactivado': 'bloqueado',
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
        placeholder="Buscar por acción, producto o usuario…"
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
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Icono nombre={ICONOS[r.accion] ?? 'bitacora'} className="h-4 w-4" />
              </span>
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
