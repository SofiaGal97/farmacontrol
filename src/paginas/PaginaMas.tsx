// ============================================================
// PÁGINA: MÁS (solo administrador)
// Agrupa las secciones de administración: proveedores, usuarios
// y bitácora, para no llenar el menú inferior del celular.
// ============================================================
import { useState } from 'react';
import Icono, { type NombreIcono } from '../componentes/Icono';
import PaginaProveedores from './PaginaProveedores';
import PaginaUsuarios from './PaginaUsuarios';
import PaginaBitacora from './PaginaBitacora';

type Seccion = 'proveedores' | 'usuarios' | 'bitacora';

const SECCIONES: { id: Seccion; titulo: string; descripcion: string; icono: NombreIcono }[] = [
  { id: 'proveedores', titulo: 'Proveedores', descripcion: 'Quién le vende la mercadería a la farmacia', icono: 'camion' },
  { id: 'usuarios', titulo: 'Usuarios', descripcion: 'Crear empleados, cambiar roles y desactivar accesos', icono: 'usuarios' },
  { id: 'bitacora', titulo: 'Bitácora', descripcion: 'Quién hizo cada cambio y cuándo', icono: 'bitacora' },
];

export default function PaginaMas() {
  const [seccion, setSeccion] = useState<Seccion | null>(null);

  if (seccion) {
    const actual = SECCIONES.find((s) => s.id === seccion)!;
    return (
      <div className="space-y-4">
        <button onClick={() => setSeccion(null)} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600">
          <Icono nombre="volver" className="h-4 w-4" /> Más opciones
        </button>
        <h2 className="text-lg font-bold text-slate-800">{actual.titulo}</h2>
        {seccion === 'proveedores' && <PaginaProveedores />}
        {seccion === 'usuarios' && <PaginaUsuarios />}
        {seccion === 'bitacora' && <PaginaBitacora />}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {SECCIONES.map((s) => (
        <button
          key={s.id}
          onClick={() => setSeccion(s.id)}
          className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm active:bg-slate-50"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Icono nombre={s.icono} className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-slate-800">{s.titulo}</span>
            <span className="block text-xs text-slate-500">{s.descripcion}</span>
          </span>
          <Icono nombre="siguiente" className="h-5 w-5 text-slate-300" />
        </button>
      ))}
    </div>
  );
}
