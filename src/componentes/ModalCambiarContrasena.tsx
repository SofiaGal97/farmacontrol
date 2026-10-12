import { useState, type FormEvent } from 'react';
import Campo from './Campo';
import Modal from './Modal';
import { claseBotonPrincipal, claseBotonSecundario, claseInput } from './estilos';
import { cambiarMiContrasena } from '../servicios/usuarios';
import { mostrarAviso } from '../servicios/avisos';
import { traducirError } from '../servicios/errores';
import { useConexion } from '../hooks/useConexion';

/** Ventana para que cualquier usuario cambie su propia contraseña */
export default function ModalCambiarContrasena({ onCerrar }: { onCerrar: () => void }) {
  const { enLinea } = useConexion();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const manejarGuardar = async (e: FormEvent) => {
    e.preventDefault();
    if (nueva.length < 6) return setError('La nueva contraseña debe tener al menos 6 caracteres.');
    if (nueva !== confirmacion) return setError('Las contraseñas nuevas no coinciden.');

    setGuardando(true);
    setError('');
    try {
      await cambiarMiContrasena(actual, nueva);
      mostrarAviso('Contraseña actualizada');
      onCerrar();
    } catch (err) {
      setError(traducirError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal titulo="🔑 Cambiar mi contraseña" onCerrar={onCerrar}>
      {!enLinea && (
        <p className="mb-3 rounded-lg bg-amber-50 p-2.5 text-xs font-medium text-amber-800">
          Para cambiar la contraseña se necesita internet.
        </p>
      )}
      <form onSubmit={manejarGuardar} className="space-y-4">
        <Campo etiqueta="Contraseña actual" obligatorio>
          <input type="password" autoComplete="current-password" className={claseInput} value={actual} onChange={(e) => setActual(e.target.value)} />
        </Campo>
        <Campo etiqueta="Nueva contraseña" obligatorio ayuda="Mínimo 6 caracteres">
          <input type="password" autoComplete="new-password" className={claseInput} value={nueva} onChange={(e) => setNueva(e.target.value)} />
        </Campo>
        <Campo etiqueta="Repite la nueva contraseña" obligatorio>
          <input type="password" autoComplete="new-password" className={claseInput} value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} />
        </Campo>

        {error && <p className="rounded-lg bg-red-50 p-2.5 text-sm font-medium text-red-700">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onCerrar} className={claseBotonSecundario}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando || !enLinea} className={claseBotonPrincipal}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
