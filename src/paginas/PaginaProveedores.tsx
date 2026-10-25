// ============================================================
// PÁGINA: PROVEEDORES (solo administrador)
// Quién le vende la mercadería a la farmacia. Se eligen al
// registrar cada entrada de mercadería (lote).
// ============================================================
import { useState, type FormEvent } from 'react';
import Campo from '../componentes/Campo';
import Icono from '../componentes/Icono';
import Modal from '../componentes/Modal';
import { claseBotonPrincipal, claseBotonSecundario, claseInput, claseTarjeta, claseTituloSeccion } from '../componentes/estilos';
import type { DatosProveedor, Proveedor } from '../modelos/tipos';
import { validarProveedor } from '../logica/validaciones';
import { cambiarEstadoProveedor, crearProveedor, editarProveedor } from '../servicios/proveedores';
import { mostrarAviso } from '../servicios/avisos';
import { useProveedores } from '../hooks/useDatos';
import { usePerfil } from '../hooks/useSesion';

export default function PaginaProveedores() {
  const perfil = usePerfil();
  const { datos: proveedores, cargando, error } = useProveedores();
  // null = cerrado, 'nuevo' = crear, Proveedor = editar
  const [formulario, setFormulario] = useState<Proveedor | 'nuevo' | null>(null);

  const manejarCambioEstado = (proveedor: Proveedor) => {
    const accion = proveedor.activo ? 'desactivar' : 'activar';
    if (!confirm(`¿Seguro que deseas ${accion} a ${proveedor.nombre}?`)) return;
    cambiarEstadoProveedor(proveedor, !proveedor.activo, perfil);
    mostrarAviso(`Proveedor ${proveedor.activo ? 'desactivado' : 'activado'}`);
  };

  return (
    <div className="space-y-4">
      <button onClick={() => setFormulario('nuevo')} className={claseBotonPrincipal}>
        <span className="inline-flex items-center justify-center gap-2">
          <Icono nombre="mas" /> Agregar proveedor
        </span>
      </button>

      <div className={claseTarjeta}>
        <h2 className={claseTituloSeccion}>Proveedores ({proveedores.length})</h2>
        {cargando && <p className="text-sm text-slate-400">Cargando…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!cargando && proveedores.length === 0 && (
          <p className="text-sm text-slate-400">Todavía no hay proveedores registrados.</p>
        )}

        <div className="divide-y divide-slate-100">
          {proveedores.map((p) => (
            <div key={p.id} className={`py-3 ${p.activo ? '' : 'opacity-50'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800">{p.nombre}</p>
                  <p className="text-xs text-slate-500">
                    {[p.contacto, p.telefono].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                  </p>
                  {p.direccion && <p className="text-xs text-slate-400">{p.direccion}</p>}
                </div>
                {!p.activo && <span className="text-[11px] font-bold text-red-600">Inactivo</span>}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setFormulario(p)}
                  className="flex-1 rounded-lg bg-slate-50 py-1.5 text-xs font-semibold text-slate-600"
                >
                  Editar
                </button>
                <button
                  onClick={() => manejarCambioEstado(p)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${
                    p.activo ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
                  }`}
                >
                  {p.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {formulario && (
        <ModalProveedor proveedor={formulario === 'nuevo' ? null : formulario} onCerrar={() => setFormulario(null)} />
      )}
    </div>
  );
}

function ModalProveedor({ proveedor, onCerrar }: { proveedor: Proveedor | null; onCerrar: () => void }) {
  const perfil = usePerfil();
  const [datos, setDatos] = useState<DatosProveedor>({
    nombre: proveedor?.nombre ?? '',
    telefono: proveedor?.telefono ?? '',
    contacto: proveedor?.contacto ?? '',
    direccion: proveedor?.direccion ?? '',
  });
  const [error, setError] = useState('');

  const cambiar = (campo: keyof DatosProveedor, valor: string) => setDatos((anterior) => ({ ...anterior, [campo]: valor }));

  const manejarGuardar = (e: FormEvent) => {
    e.preventDefault();
    const resultado = validarProveedor(datos);
    if (resultado.valido === false) return setError(resultado.error);
    if (proveedor) editarProveedor(proveedor, resultado.datos, perfil);
    else crearProveedor(resultado.datos, perfil);
    mostrarAviso(`Proveedor ${resultado.datos.nombre} guardado`);
    onCerrar();
  };

  return (
    <Modal titulo={proveedor ? 'Editar proveedor' : 'Nuevo proveedor'} onCerrar={onCerrar}>
      <form onSubmit={manejarGuardar} className="space-y-4">
        <Campo etiqueta="Nombre o empresa" obligatorio>
          <input className={claseInput} value={datos.nombre} onChange={(e) => cambiar('nombre', e.target.value)} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Teléfono">
            <input
              type="tel"
              inputMode="tel"
              className={claseInput}
              value={datos.telefono}
              onChange={(e) => cambiar('telefono', e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Persona de contacto">
            <input className={claseInput} value={datos.contacto} onChange={(e) => cambiar('contacto', e.target.value)} />
          </Campo>
        </div>
        <Campo etiqueta="Dirección">
          <input className={claseInput} value={datos.direccion} onChange={(e) => cambiar('direccion', e.target.value)} />
        </Campo>
        {error && <p className="rounded-lg bg-red-50 p-2.5 text-sm font-medium text-red-700">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onCerrar} className={claseBotonSecundario}>
            Cancelar
          </button>
          <button type="submit" className={claseBotonPrincipal}>
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
}
