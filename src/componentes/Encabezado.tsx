import type { Usuario } from '../modelos/tipos';
import { useConexion } from '../hooks/useConexion';
import { cerrarSesion } from '../servicios/usuarios';

/** Barra superior: nombre del sistema, usuario, rol y estado de conexión */
export default function Encabezado({ perfil }: { perfil: Usuario }) {
  const { enLinea, pendientes } = useConexion();

  const manejarSalir = () => {
    if (pendientes > 0 && !enLinea) {
      const seguir = confirm(
        `Hay ${pendientes} cambio(s) sin subir a la nube. Si cierras sesión ahora se subirán la próxima vez que entres con internet. ¿Cerrar sesión?`,
      );
      if (!seguir) return;
    }
    cerrarSesion();
  };

  return (
    <header className="sticky top-0 z-20 bg-blue-600 text-white shadow-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <div>
          <h1 className="text-lg font-bold leading-tight">💊 FarmaControl</h1>
          <p className="text-xs opacity-90">
            {perfil.nombre} · {perfil.rol === 'admin' ? 'Administrador' : 'Empleado'}
          </p>
        </div>
        <button
          onClick={manejarSalir}
          className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold active:bg-white/25"
        >
          Salir
        </button>
      </div>

      {/* Estado de conexión y sincronización */}
      <div
        className={`px-4 py-1 text-center text-[11px] font-semibold ${
          !enLinea ? 'bg-amber-500' : pendientes > 0 ? 'bg-blue-800' : 'bg-blue-700'
        }`}
      >
        {!enLinea
          ? `📴 Sin internet — trabajando en este dispositivo${pendientes > 0 ? ` (${pendientes} cambio(s) por subir)` : ''}`
          : pendientes > 0
            ? `⏳ Subiendo ${pendientes} cambio(s) a la nube…`
            : '☁️ Conectado y sincronizado'}
      </div>
    </header>
  );
}
