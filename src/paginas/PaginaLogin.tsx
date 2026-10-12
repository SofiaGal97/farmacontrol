// ============================================================
// PÁGINA: INICIO DE SESIÓN
// Tres modos: iniciar sesión, recuperar contraseña y, solo la
// primera vez, crear la cuenta de la administradora.
// ============================================================
import { useEffect, useState, type FormEvent } from 'react';
import Campo from '../componentes/Campo';
import { claseBotonPrincipal, claseInput } from '../componentes/estilos';
import {
  crearPrimerAdministrador,
  iniciarSesion,
  recuperarContrasena,
  sistemaConfigurado,
} from '../servicios/usuarios';
import { traducirError } from '../servicios/errores';
import { validarNuevoUsuario } from '../logica/validaciones';
import { mostrarAviso } from '../servicios/avisos';

type Modo = 'entrar' | 'recuperar' | 'primerAdmin';

export default function PaginaLogin() {
  const [modo, setModo] = useState<Modo>('entrar');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [mostrarPrimerAdmin, setMostrarPrimerAdmin] = useState(false);

  // Si todavía no existe ningún administrador, ofrecemos crearlo
  useEffect(() => {
    sistemaConfigurado().then((configurado) => setMostrarPrimerAdmin(!configurado));
  }, []);

  const cambiarModo = (nuevo: Modo) => {
    setModo(nuevo);
    setError('');
  };

  const manejarEnviar = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (modo === 'primerAdmin') {
      const problema = validarNuevoUsuario(nombre, correo, contrasena);
      if (problema) return setError(problema);
    }

    setProcesando(true);
    try {
      if (modo === 'entrar') {
        await iniciarSesion(correo, contrasena);
      } else if (modo === 'recuperar') {
        await recuperarContrasena(correo);
        mostrarAviso('Te enviamos un correo para cambiar tu contraseña.', 'info');
        cambiarModo('entrar');
      } else {
        await crearPrimerAdministrador(nombre, correo, contrasena);
        mostrarAviso('¡Cuenta de administrador creada!');
      }
    } catch (err) {
      setError(traducirError(err));
    } finally {
      setProcesando(false);
    }
  };

  const titulos: Record<Modo, string> = {
    entrar: 'Iniciar sesión',
    recuperar: 'Recuperar contraseña',
    primerAdmin: 'Crear cuenta de administrador',
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-600 to-blue-800 p-4">
      <div className="mb-6 text-center text-white">
        <div className="text-5xl">💊</div>
        <h1 className="mt-2 text-2xl font-black">FarmaControl</h1>
        <p className="text-sm opacity-90">Farmacia "Regalo de Dios"</p>
      </div>

      <form onSubmit={manejarEnviar} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-slate-800">{titulos[modo]}</h2>

        {modo === 'primerAdmin' && (
          <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
            Esta opción solo aparece la primera vez. La cuenta que crees será la del administrador
            del sistema.
          </p>
        )}

        {modo === 'primerAdmin' && (
          <Campo etiqueta="Nombre completo" obligatorio>
            <input className={claseInput} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Campo>
        )}

        <Campo etiqueta="Correo electrónico" obligatorio>
          <input
            type="email"
            autoComplete="email"
            className={claseInput}
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
          />
        </Campo>

        {modo !== 'recuperar' && (
          <Campo etiqueta="Contraseña" obligatorio ayuda={modo === 'primerAdmin' ? 'Mínimo 6 caracteres' : undefined}>
            <input
              type="password"
              autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
              className={claseInput}
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
            />
          </Campo>
        )}

        {error && <p className="rounded-lg bg-red-50 p-2.5 text-sm font-medium text-red-700">{error}</p>}

        <button type="submit" disabled={procesando} className={claseBotonPrincipal}>
          {procesando ? 'Un momento…' : modo === 'entrar' ? 'Entrar' : modo === 'recuperar' ? 'Enviar correo' : 'Crear cuenta'}
        </button>

        <div className="space-y-2 text-center text-sm">
          {modo !== 'entrar' && (
            <button type="button" onClick={() => cambiarModo('entrar')} className="text-blue-600">
              ← Volver a iniciar sesión
            </button>
          )}
          {modo === 'entrar' && (
            <button type="button" onClick={() => cambiarModo('recuperar')} className="block w-full text-slate-500">
              ¿Olvidaste tu contraseña?
            </button>
          )}
          {modo === 'entrar' && mostrarPrimerAdmin && (
            <button type="button" onClick={() => cambiarModo('primerAdmin')} className="block w-full font-semibold text-blue-600">
              Primera vez: crear cuenta de administrador
            </button>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-400">
          La primera vez necesitas internet. Después puedes trabajar sin conexión.
        </p>
      </form>
    </div>
  );
}
