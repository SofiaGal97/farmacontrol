// ============================================================
// COMPONENTE PRINCIPAL
// Decide qué mostrar según la sesión:
//   cargando → pantalla de carga
//   sin sesión → inicio de sesión
//   sin permiso → mensaje de acceso denegado
//   con sesión → encabezado + página elegida + menú inferior
// ============================================================
import { useEffect, useState } from 'react';
import { SesionProvider, useSesion } from './hooks/useSesion';
import Avisos from './componentes/Avisos';
import Encabezado from './componentes/Encabezado';
import MenuInferior, { pestanasPermitidas, type Pestana } from './componentes/MenuInferior';
import PantallaCarga from './componentes/PantallaCarga';
import { claseBotonPrincipal } from './componentes/estilos';
import { cerrarSesion } from './servicios/usuarios';
import PaginaLogin from './paginas/PaginaLogin';
import PaginaInventario from './paginas/PaginaInventario';
import PaginaVenta from './paginas/PaginaVenta';
import PaginaReportes from './paginas/PaginaReportes';
import PaginaMas from './paginas/PaginaMas';
import Icono from './componentes/Icono';

export default function App() {
  return (
    <SesionProvider>
      <Contenido />
      <Avisos />
    </SesionProvider>
  );
}

function Contenido() {
  const { usuarioAuth, perfil, cargando } = useSesion();
  const [pestana, setPestana] = useState<Pestana>('inventario');

  // Al cambiar de pestaña se empieza desde arriba
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pestana]);

  if (cargando) return <PantallaCarga />;
  if (!usuarioAuth) return <PaginaLogin />;
  if (!perfil || !perfil.activo) return <SinAcceso desactivado={Boolean(perfil && !perfil.activo)} />;

  // Si un empleado intenta abrir una pestaña de administrador, lo regresamos al inventario
  const pestanaVisible = pestanasPermitidas(perfil.rol).includes(pestana) ? pestana : 'inventario';

  return (
    <div className="min-h-screen bg-slate-100 pb-24 text-slate-800 antialiased">
      <Encabezado perfil={perfil} />

      <main className="mx-auto max-w-3xl p-4">
        {pestanaVisible === 'inventario' && <PaginaInventario />}
        {pestanaVisible === 'vender' && <PaginaVenta />}
        {pestanaVisible === 'reportes' && <PaginaReportes />}
        {pestanaVisible === 'mas' && <PaginaMas />}
      </main>

      <MenuInferior rol={perfil.rol} activa={pestanaVisible} onCambiar={setPestana} />
    </div>
  );
}

function SinAcceso({ desactivado }: { desactivado: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 text-center shadow-xl">
        <Icono nombre="candado" className="mx-auto h-12 w-12 text-slate-400" />
        <h2 className="text-lg font-bold text-slate-800">
          {desactivado ? 'Tu usuario está desactivado' : 'No se encontró tu perfil'}
        </h2>
        <p className="text-sm text-slate-500">
          {desactivado
            ? 'Pide al administrador que vuelva a activar tu acceso.'
            : 'Si es la primera vez que entras en este dispositivo, conéctate a internet. Si el problema sigue, pide al administrador que te cree un usuario.'}
        </p>
        <button onClick={() => cerrarSesion()} className={claseBotonPrincipal}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
