import { useState, type FormEvent } from 'react';
import Modal from './Modal';
import CamposEntrada from './CamposEntrada';
import { claseBotonPrincipal, claseBotonSecundario } from './estilos';
import type { Producto } from '../modelos/tipos';
import { FORMULARIO_ENTRADA_VACIO, validarEntrada, type FormularioEntrada } from '../logica/validaciones';
import { registrarEntrada } from '../servicios/lotes';
import { mostrarAviso } from '../servicios/avisos';
import { useProveedores } from '../hooks/useDatos';
import { usePerfil } from '../hooks/useSesion';

/** Ventana para registrar la llegada de mercadería (un lote nuevo) */
export default function ModalEntrada({ producto, onCerrar }: { producto: Producto; onCerrar: () => void }) {
  const perfil = usePerfil();
  const esAdmin = perfil.rol === 'admin';
  const { datos: proveedores } = useProveedores();
  const [formulario, setFormulario] = useState<FormularioEntrada>({
    ...FORMULARIO_ENTRADA_VACIO,
    costoUnitario: String(producto.precioCosto),
  });
  const [error, setError] = useState('');

  const cambiar = (campo: keyof FormularioEntrada, valor: string) =>
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));

  const manejarGuardar = (e: FormEvent) => {
    e.preventDefault();
    const resultado = validarEntrada(formulario);
    if (resultado.valido === false) {
      setError(resultado.error);
      return;
    }
    const proveedor = proveedores.find((p) => p.id === resultado.datos.proveedorId);
    registrarEntrada(producto, { ...resultado.datos, proveedorNombre: proveedor?.nombre ?? '' }, perfil);
    mostrarAviso(`+${resultado.datos.cantidad} unidades de ${producto.nombre} (lote ${resultado.datos.numeroLote})`);
    onCerrar();
  };

  return (
    <Modal titulo="Entrada de mercadería" onCerrar={onCerrar}>
      <p className="mb-4 text-sm text-slate-500">
        <b className="text-slate-700">{producto.nombre}</b> · Existencia actual: {producto.stock} u.
      </p>
      <form onSubmit={manejarGuardar} className="space-y-4">
        <CamposEntrada formulario={formulario} onCambiar={cambiar} proveedores={proveedores} mostrarCosto={esAdmin} />
        {error && <p className="rounded-lg bg-red-50 p-2.5 text-sm font-medium text-red-700">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onCerrar} className={claseBotonSecundario}>
            Cancelar
          </button>
          <button type="submit" className={claseBotonPrincipal}>
            Registrar
          </button>
        </div>
      </form>
    </Modal>
  );
}
