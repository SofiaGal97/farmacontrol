import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Icono from './Icono';

interface ModalProps {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
}

/**
 * Ventana flotante. Se cierra con la X o tocando fuera de ella.
 * Se dibuja directamente en <body> para que quede por encima de la
 * barra superior y del menú inferior, sin heredar sus colores.
 */
export default function Modal({ titulo, onCerrar, children }: ModalProps) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-slate-800 sm:items-center"
      onClick={onCerrar}
    >
      <div
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-lg font-bold text-slate-800">{titulo}</h3>
          <button onClick={onCerrar} className="p-1 text-slate-400" aria-label="Cerrar">
            <Icono nombre="cerrar" className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
