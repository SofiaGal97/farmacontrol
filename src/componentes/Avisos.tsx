import { useEffect, useState } from 'react';
import { cerrarAviso, suscribirAvisos, type Aviso } from '../servicios/avisos';

const COLORES: Record<Aviso['tipo'], string> = {
  exito: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-slate-800',
};

/** Muestra los mensajes flotantes arriba de la pantalla */
export default function Avisos() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  useEffect(() => suscribirAvisos(setAvisos), []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] mx-auto flex max-w-md flex-col gap-2 px-4">
      {avisos.map((aviso) => (
        <button
          key={aviso.id}
          onClick={() => cerrarAviso(aviso.id)}
          className={`pointer-events-auto rounded-xl px-4 py-3 text-left text-sm font-semibold text-white shadow-lg ${COLORES[aviso.tipo]}`}
        >
          {aviso.mensaje}
        </button>
      ))}
    </div>
  );
}
