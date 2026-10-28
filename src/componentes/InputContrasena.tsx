import { useState } from 'react';
import { claseInput } from './estilos';
import Icono from './Icono';

interface InputContrasenaProps {
  valor: string;
  onCambiar: (valor: string) => void;
  autoComplete?: 'current-password' | 'new-password';
  required?: boolean;
}

/** Campo de contraseña con el botón del ojito para mostrarla u ocultarla */
export default function InputContrasena({ valor, onCambiar, autoComplete = 'current-password', required }: InputContrasenaProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={`${claseInput} pr-12`}
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        required={required}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-500"
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        <Icono nombre={visible ? 'ojoTachado' : 'ojo'} className="h-5 w-5" />
      </button>
    </div>
  );
}
