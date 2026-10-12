import type { ReactNode } from 'react';

interface CampoProps {
  etiqueta: string;
  obligatorio?: boolean;
  ayuda?: string;
  children: ReactNode; // el input, select, etc.
}

/** Etiqueta + campo del formulario + texto de ayuda opcional */
export default function Campo({ etiqueta, obligatorio, ayuda, children }: CampoProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
        {etiqueta}
        {obligatorio && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {ayuda && <span className="mt-0.5 block text-[11px] text-slate-400">{ayuda}</span>}
    </label>
  );
}
