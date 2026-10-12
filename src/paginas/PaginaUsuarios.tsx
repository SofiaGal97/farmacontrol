// ============================================================
// PÁGINA: USUARIOS (solo administrador)
// Crear empleados, cambiar rol y activar/desactivar acceso.
// ============================================================
import { useState, type FormEvent } from 'react';
import Campo from '../componentes/Campo';
import InputContrasena from '../componentes/InputContrasena';
import Modal from '../componentes/Modal';
import { claseBotonPrincipal, claseBotonSecundario, claseInput, claseTarjeta, claseTituloSeccion } from '../componentes/estilos';
import type { Rol, Usuario } from '../modelos/tipos';
import { validarNuevoUsuario } from '../logica/validaciones';
import { correoAUsuario } from '../logica/nombreUsuario';
import { cambiarEstadoUsuario, cambiarRol, crearUsuario } from '../servicios/usuarios';
import { mostrarAviso } from '../servicios/avisos';
import { traducirError } from '../servicios/errores';
import { useUsuarios } from '../hooks/useDatos';
import { usePerfil } from '../hooks/useSesion';
import { useConexion } from '../hooks/useConexion';

export default function PaginaUsuarios() {
  const perfil = usePerfil();
  const { datos: usuarios, cargando, error } = useUsuarios();
  const [creando, setCreando] = useState(false);

  const manejarCambioRol = (usuario: Usuario) => {
    const nuevoRol: Rol = usuario.rol === 'admin' ? 'empleado' : 'admin';
    if (!confirm(`¿Cambiar a ${usuario.nombre} a "${nuevoRol}"?`)) return;
    cambiarRol(usuario, nuevoRol, perfil);
    mostrarAviso('Rol actualizado');
  };

  const manejarCambioEstado = (usuario: Usuario) => {
    const accion = usuario.activo ? 'desactivar' : 'activar';
    if (!confirm(`¿Seguro que deseas ${accion} a ${usuario.nombre}?`)) return;
    cambiarEstadoUsuario(usuario, !usuario.activo, perfil);
    mostrarAviso(`Usuario ${usuario.activo ? 'desactivado' : 'activado'}`);
  };

  return (
    <div className="space-y-4">
      <button onClick={() => setCreando(true)} className={claseBotonPrincipal}>
        👤 Crear usuario
      </button>

      <div className={claseTarjeta}>
        <h2 className={claseTituloSeccion}>Usuarios del sistema ({usuarios.length})</h2>
        {cargando && <p className="text-sm text-slate-400">Cargando…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="divide-y divide-slate-100">
          {usuarios.map((usuario) => {
            const soyYo = usuario.uid === perfil.uid;
            return (
              <div key={usuario.uid} className={`py-3 ${usuario.activo ? '' : 'opacity-50'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800">
                      {usuario.nombre} {soyYo && <span className="text-xs font-normal text-slate-400">(tú)</span>}
                    </p>
                    <p className="truncate text-xs text-slate-500">Usuario: {usuario.usuario ?? correoAUsuario(usuario.correo)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        usuario.rol === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {usuario.rol === 'admin' ? 'Administrador' : 'Empleado'}
                    </span>
                    {!usuario.activo && <span className="text-[11px] font-bold text-red-600">Desactivado</span>}
                  </div>
                </div>

                {!soyYo && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => manejarCambioRol(usuario)}
                      className="flex-1 rounded-lg bg-slate-50 py-1.5 text-xs font-semibold text-slate-600"
                    >
                      Hacer {usuario.rol === 'admin' ? 'empleado' : 'administrador'}
                    </button>
                    <button
                      onClick={() => manejarCambioEstado(usuario)}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${
                        usuario.activo ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
                      }`}
                    >
                      {usuario.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {creando && <ModalCrearUsuario onCerrar={() => setCreando(false)} />}
    </div>
  );
}

function ModalCrearUsuario({ onCerrar }: { onCerrar: () => void }) {
  const perfil = usePerfil();
  const { enLinea } = useConexion();
  const [nombre, setNombre] = useState('');
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [rol, setRol] = useState<Rol>('empleado');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const manejarGuardar = async (e: FormEvent) => {
    e.preventDefault();
    const problema = validarNuevoUsuario(nombre, nombreUsuario, contrasena);
    if (problema) {
      setError(problema);
      return;
    }
    setGuardando(true);
    setError('');
    try {
      await crearUsuario(nombre, nombreUsuario, contrasena, rol, perfil);
      mostrarAviso(`Usuario ${nombre} creado`);
      onCerrar();
    } catch (err) {
      setError(traducirError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal titulo="👤 Nuevo usuario" onCerrar={onCerrar}>
      {!enLinea && (
        <p className="mb-3 rounded-lg bg-amber-50 p-2.5 text-xs font-medium text-amber-800">
          Para crear usuarios se necesita internet.
        </p>
      )}
      <form onSubmit={manejarGuardar} className="space-y-4">
        <Campo etiqueta="Nombre completo" obligatorio>
          <input className={claseInput} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Campo etiqueta="Usuario" obligatorio ayuda="Con esto entrará al sistema. Sin espacios ni tildes (solo letras, números o punto)">
          <input
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Usuario para entrar"
            className={claseInput}
            value={nombreUsuario}
            onChange={(e) => setNombreUsuario(e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Contraseña inicial" obligatorio ayuda="Mínimo 6 caracteres">
          <InputContrasena valor={contrasena} onCambiar={setContrasena} autoComplete="new-password" />
        </Campo>
        <Campo etiqueta="Rol" obligatorio>
          <select className={claseInput} value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
            <option value="empleado">Empleado (inventario y ventas)</option>
            <option value="admin">Administrador (acceso total)</option>
          </select>
        </Campo>

        {error && <p className="rounded-lg bg-red-50 p-2.5 text-sm font-medium text-red-700">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onCerrar} className={claseBotonSecundario}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando || !enLinea} className={claseBotonPrincipal}>
            {guardando ? 'Creando…' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
