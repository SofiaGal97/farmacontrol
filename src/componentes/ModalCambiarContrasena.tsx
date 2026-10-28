import { useState, type FormEvent } from 'react';
import Campo from './Campo';
import InputContrasena from './InputContrasena';
import Modal from './Modal';
import { claseBotonPrincipal, claseBotonSecundario } from './estilos';
import { cambiarMiContrasena } from '../servicios/usuarios';
import { mostrarAviso } from '../servicios/avisos';
import { traducirError } from '../servicios/errores';
import { useConexion } from '../hooks/useConexion';
import { AYUDA_CONTRASENA, validarContrasena } from '../logica/validaciones';

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
    if (!actual) return setError('Escribe tu contraseña actual.');
    const problema = validarContrasena(nueva);
    if (problema) return setError(problema);
    if (nueva === actual) return setError('La nueva contraseña debe ser diferente a la actual.');
    if (nueva !== confirmacion) return setError('Las contraseñas nuevas no coinciden.');

    setGuardando(true);
    setError('');
    try {
      await cambiarMiContrasena(actual, nueva);
      mostrarAviso('Contraseña actualizada');
      onCerrar();
    } catch (err) {
      const codigo = (err as { code?: string })?.code ?? '';
      const claveMala = codigo === 'auth/invalid-credential' || codigo === 'auth/wrong-password';
      setError(claveMala ? 'La contraseña actual no es correcta.' : traducirError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal titulo="Cambiar mi contraseña" onCerrar={onCerrar}>
      {!enLinea && (
        <p className="mb-3 rounded-lg bg-amber-50 p-2.5 text-xs font-medium text-amber-800">
          Para cambiar la contraseña se necesita internet.
        </p>
      )}
      <form onSubmit={manejarGuardar} className="space-y-4">
        <Campo etiqueta="Contraseña actual" obligatorio>
          <InputContrasena valor={actual} onCambiar={setActual} autoComplete="current-password" />
        </Campo>
        <Campo etiqueta="Nueva contraseña" obligatorio ayuda={AYUDA_CONTRASENA}>
          <InputContrasena valor={nueva} onCambiar={setNueva} autoComplete="new-password" />
        </Campo>
        <Campo etiqueta="Repite la nueva contraseña" obligatorio>
          <InputContrasena valor={confirmacion} onCambiar={setConfirmacion} autoComplete="new-password" />
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
