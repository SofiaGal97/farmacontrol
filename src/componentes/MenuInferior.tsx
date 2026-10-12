import type { Rol } from '../modelos/tipos';
import Icono, { type NombreIcono } from './Icono';

export type Pestana = 'inventario' | 'vender' | 'reportes' | 'usuarios' | 'bitacora';

interface OpcionMenu {
  id: Pestana;
  icono: NombreIcono;
  texto: string;
  soloAdmin: boolean;
}

const OPCIONES: OpcionMenu[] = [
  { id: 'inventario', icono: 'paquete', texto: 'Inventario', soloAdmin: false },
  { id: 'vender', icono: 'carrito', texto: 'Vender', soloAdmin: false },
  { id: 'reportes', icono: 'grafica', texto: 'Reportes', soloAdmin: true },
  { id: 'usuarios', icono: 'usuarios', texto: 'Usuarios', soloAdmin: true },
  { id: 'bitacora', icono: 'bitacora', texto: 'Bitácora', soloAdmin: true },
];

/** Pestañas que puede ver cada rol */
export function pestanasPermitidas(rol: Rol): Pestana[] {
  return OPCIONES.filter((o) => rol === 'admin' || !o.soloAdmin).map((o) => o.id);
}

interface MenuInferiorProps {
  rol: Rol;
  activa: Pestana;
  onCambiar: (pestana: Pestana) => void;
}

/** Menú de navegación fijo en la parte de abajo (cómodo en celular) */
export default function MenuInferior({ rol, activa, onCambiar }: MenuInferiorProps) {
  const visibles = OPCIONES.filter((o) => rol === 'admin' || !o.soloAdmin);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-xl">
      <div className="mx-auto flex max-w-3xl justify-around px-2 py-2">
        {visibles.map((opcion) => (
          <button
            key={opcion.id}
            onClick={() => onCambiar(opcion.id)}
            className={`flex flex-1 flex-col items-center rounded-lg py-1 text-[11px] font-bold transition-colors ${
              activa === opcion.id ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            <Icono nombre={opcion.icono} className="h-6 w-6" />
            <span className="mt-0.5">{opcion.texto}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
