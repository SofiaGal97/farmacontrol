import { useState, type FormEvent } from 'react';
import Modal from './Modal';
import Campo from './Campo';
import { claseBotonPrincipal, claseBotonSecundario, claseInput } from './estilos';
import type { Lote, Producto } from '../modelos/tipos';
import { formatoFechaTexto } from '../logica/formato';
import { ajustarLote, MOTIVOS_AJUSTE, type MotivoAjuste } from '../servicios/lotes';
import { mostrarAviso } from '../servicios/avisos';
import { usePerfil } from '../hooks/useSesion';

interface Props {
  producto: Producto;
  lote: Lote;
  onCerrar: () => void;
}

/**
 * Ventana para corregir las unidades de un lote (solo administrador).
 * Ej. dar de baja un lote vencido (dejarlo en 0) o corregir un conteo físico.
 */
export default function ModalAjusteLote({ producto, lote, onCerrar }: Props) {
  const perfil = usePerfil();
  const [nuevaCantidad, setNuevaCantidad] = useState(String(lote.cantidad));
  const [motivo, setMotivo] = useState<MotivoAjuste>('Vencido');
  const [observacion, setObservacion] = useState('');
  const [error, setError] = useState('');

  const manejarGuardar = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d+$/.test(nuevaCantidad)) return setError('Escribe la nueva cantidad (0 o más).');
    const cantidad = parseInt(nuevaCantidad, 10);
    if (cantidad === lote.cantidad) return setError('La cantidad es la misma; no hay nada que ajustar.');
    if (motivo === 'Otro' && !observacion.trim()) return setError('Explica el motivo en la observación.');
    if (!confirm(`¿Cambiar el lote ${lote.numeroLote} de ${lote.cantidad} a ${cantidad} unidades?`)) return;

    ajustarLote(producto, lote, cantidad, motivo, observacion.trim(), perfil);
    mostrarAviso(`Lote ${lote.numeroLote} ajustado a ${cantidad} unidades`);
    onCerrar();
  };

  return (
    <Modal titulo="Ajuste o baja de lote" onCerrar={onCerrar}>
      <p className="mb-4 text-sm text-slate-500">
        <b className="text-slate-700">{producto.nombre}</b> · Lote {lote.numeroLote} · Vence{' '}
        {formatoFechaTexto(lote.vencimiento)} · Quedan {lote.cantidad} u.
      </p>
      <form onSubmit={manejarGuardar} className="space-y-4">
        <Campo etiqueta="Motivo" obligatorio>
          <select className={claseInput} value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoAjuste)}>
            {MOTIVOS_AJUSTE.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Campo>
        <Campo
          etiqueta="Nueva cantidad del lote"
          obligatorio
          ayuda={motivo === 'Vencido' || motivo === 'Dañado' ? 'Para desechar todo el lote, escribe 0' : 'Las unidades que hay físicamente'}
        >
          <input
            type="number"
            inputMode="numeric"
            min="0"
            className={claseInput}
            value={nuevaCantidad}
            onChange={(e) => setNuevaCantidad(e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Observación">
          <input
            className={claseInput}
            placeholder="Opcional" maxLength={200}
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
          />
        </Campo>
        {error && <p className="rounded-lg bg-red-50 p-2.5 text-sm font-medium text-red-700">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onCerrar} className={claseBotonSecundario}>
            Cancelar
          </button>
          <button type="submit" className={claseBotonPrincipal}>
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
}
