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
import { claseBotonPrincipal, claseTarjeta } from '../componentes/estilos';
import { descargarRespaldoCompleto } from '../servicios/respaldo';
import { mostrarAviso } from '../servicios/avisos';
import { traducirError } from '../servicios/errores';
import { useConexion } from '../hooks/useConexion';

type Seccion = 'proveedores' | 'usuarios' | 'bitacora' | 'respaldo';

const SECCIONES: { id: Seccion; titulo: string; descripcion: string; icono: NombreIcono }[] = [
  { id: 'proveedores', titulo: 'Proveedores', descripcion: 'Quién le vende la mercadería a la farmacia', icono: 'camion' },
  { id: 'usuarios', titulo: 'Usuarios', descripcion: 'Crear empleados, cambiar roles y desactivar accesos', icono: 'usuarios' },
  { id: 'bitacora', titulo: 'Bitácora', descripcion: 'Quién hizo cada cambio y cuándo', icono: 'bitacora' },
  { id: 'respaldo', titulo: 'Respaldo de datos', descripcion: 'Descargar una copia de toda la información', icono: 'descargar' },
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
        {seccion === 'respaldo' && <SeccionRespaldo />}
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

/** Descarga de la copia de seguridad completa en Excel */
function SeccionRespaldo() {
  const { enLinea } = useConexion();
  const [generando, setGenerando] = useState(false);

  const manejarDescarga = async () => {
    setGenerando(true);
    try {
      const { registros } = await descargarRespaldoCompleto();
      mostrarAviso(`Respaldo descargado (${registros} registros)`);
    } catch (error) {
      console.error(error);
      mostrarAviso(`No se pudo generar el respaldo: ${traducirError(error)}`, 'error');
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className={`${claseTarjeta} space-y-4`}>
      <p className="text-sm text-slate-600">
        Descarga un archivo de Excel con <b>toda</b> la información del sistema: productos, lotes, proveedores,
        ventas, kardex y usuarios (sin contraseñas). Guárdalo en una memoria USB o en Google Drive.
      </p>
      <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
        Recomendación: descargar un respaldo <b>cada semana</b>. Si algún día se pierde información, con este
        archivo se puede recuperar.
      </p>
      {!enLinea && (
        <p className="rounded-lg bg-amber-50 p-2.5 text-xs font-medium text-amber-800">
          Conéctate a internet para que el respaldo incluya los datos más recientes.
        </p>
      )}
      <button onClick={manejarDescarga} disabled={generando || !enLinea} className={claseBotonPrincipal}>
        <span className="inline-flex items-center justify-center gap-2">
          <Icono nombre="excel" /> {generando ? 'Generando respaldo…' : 'Descargar respaldo completo'}
        </span>
      </button>
    </div>
  );
}
