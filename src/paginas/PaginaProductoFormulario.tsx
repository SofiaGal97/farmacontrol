// ============================================================
// PÁGINA: AGREGAR / EDITAR PRODUCTO (solo administrador)
// Al crear, se puede registrar de una vez el primer lote que ingresa.
// ============================================================
import { useState, type FormEvent } from 'react';
import Campo from '../componentes/Campo';
import CamposEntrada from '../componentes/CamposEntrada';
import { claseBotonPrincipal, claseBotonSecundario, claseInput, claseTarjeta } from '../componentes/estilos';
import type { DatosEntrada, Producto } from '../modelos/tipos';
import {
  FORMULARIO_ENTRADA_VACIO,
  FORMULARIO_PRODUCTO_VACIO,
  buscarDuplicado,
  validarEntrada,
  validarProducto,
  type FormularioEntrada,
  type FormularioProducto,
} from '../logica/validaciones';
import { formatoQuetzales } from '../logica/formato';
import { crearProducto, editarProducto } from '../servicios/productos';
import { mostrarAviso } from '../servicios/avisos';
import { useProductos, useProveedores } from '../hooks/useDatos';
import { usePerfil } from '../hooks/useSesion';

interface Props {
  productoAEditar?: Producto; // si viene, estamos editando; si no, es nuevo
  onTerminar: () => void;
}

/** Convierte un producto guardado a los textos del formulario */
function productoAFormulario(p: Producto): FormularioProducto {
  return {
    nombre: p.nombre,
    componenteActivo: p.componenteActivo,
    laboratorio: p.laboratorio,
    tipo: p.tipo,
    presentacion: p.presentacion,
    codigo: p.codigo,
    stockMinimo: String(p.stockMinimo),
    precioCosto: String(p.precioCosto),
    precioVenta: String(p.precioVenta),
  };
}

export default function PaginaProductoFormulario({ productoAEditar, onTerminar }: Props) {
  const perfil = usePerfil();
  const { datos: proveedores } = useProveedores();
  const { datos: productos } = useProductos();
  const editando = Boolean(productoAEditar);

  const [formulario, setFormulario] = useState<FormularioProducto>(
    productoAEditar ? productoAFormulario(productoAEditar) : FORMULARIO_PRODUCTO_VACIO,
  );
  const [conExistencias, setConExistencias] = useState(true);
  const [entrada, setEntrada] = useState<FormularioEntrada>(FORMULARIO_ENTRADA_VACIO);
  const [error, setError] = useState('');

  /** Actualiza un solo campo del formulario */
  const cambiar = (campo: keyof FormularioProducto, valor: string) =>
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  const cambiarEntrada = (campo: keyof FormularioEntrada, valor: string) =>
    setEntrada((anterior) => ({ ...anterior, [campo]: valor }));

  const manejarGuardar = (e: FormEvent) => {
    e.preventDefault();
    const resultado = validarProducto(formulario);
    if (resultado.valido === false) return setError(resultado.error);
    const duplicado = buscarDuplicado(resultado.datos, productos, productoAEditar?.id);
    if (duplicado) return setError(duplicado);

    if (productoAEditar) {
      editarProducto(productoAEditar, resultado.datos, perfil);
      mostrarAviso(`"${resultado.datos.nombre}" actualizado`);
      return onTerminar();
    }

    let primeraEntrada: DatosEntrada | null = null;
    if (conExistencias) {
      // Si no escribió costo del lote, se usa el precio de costo del producto
      const validacion = validarEntrada({ ...entrada, costoUnitario: entrada.costoUnitario || formulario.precioCosto });
      if (validacion.valido === false) return setError(`Existencias iniciales: ${validacion.error}`);
      const proveedor = proveedores.find((p) => p.id === validacion.datos.proveedorId);
      primeraEntrada = { ...validacion.datos, proveedorNombre: proveedor?.nombre ?? '' };
    }

    crearProducto(resultado.datos, primeraEntrada, perfil);
    mostrarAviso(`"${resultado.datos.nombre}" agregado al inventario`);
    onTerminar();
  };

  // Ganancia por unidad (se muestra mientras se escribe)
  const costo = Number(formulario.precioCosto) || 0;
  const venta = Number(formulario.precioVenta) || 0;

  return (
    <form onSubmit={manejarGuardar} className="space-y-4">
      <div className={`${claseTarjeta} space-y-4`}>
        <h2 className="text-lg font-bold text-slate-800">{editando ? 'Editar medicamento' : 'Registrar medicamento'}</h2>

        <Campo etiqueta="Nombre comercial" obligatorio>
          <input
            className={claseInput}
            placeholder="Ej. Panadol Forte"
            value={formulario.nombre}
            onChange={(e) => cambiar('nombre', e.target.value)}
          />
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Componente activo">
            <input
              className={claseInput}
              placeholder="Ej. Paracetamol"
              value={formulario.componenteActivo}
              onChange={(e) => cambiar('componenteActivo', e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Presentación">
            <input
              className={claseInput}
              placeholder="Ej. Tabletas 500 mg"
              value={formulario.presentacion}
              onChange={(e) => cambiar('presentacion', e.target.value)}
            />
          </Campo>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Laboratorio" obligatorio>
            <input
              className={claseInput}
              placeholder="Ej. Bayer"
              value={formulario.laboratorio}
              onChange={(e) => cambiar('laboratorio', e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Tipo" obligatorio>
            <select className={claseInput} value={formulario.tipo} onChange={(e) => cambiar('tipo', e.target.value)}>
              <option value="">Seleccione</option>
              <option value="Etico">Ético (patente)</option>
              <option value="Generico">Genérico</option>
            </select>
          </Campo>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Código" ayuda="Opcional: código de barras o interno">
            <input
              className={claseInput}
              value={formulario.codigo}
              onChange={(e) => cambiar('codigo', e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Stock mínimo" obligatorio ayuda="Avisa al llegar a esta cantidad">
            <input
              type="number"
              inputMode="numeric"
              min="0"
              className={claseInput}
              value={formulario.stockMinimo}
              onChange={(e) => cambiar('stockMinimo', e.target.value)}
            />
          </Campo>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Precio costo (Q)" obligatorio ayuda="Lo que cobra el proveedor">
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              className={claseInput}
              placeholder="0.00"
              value={formulario.precioCosto}
              onChange={(e) => cambiar('precioCosto', e.target.value)}
            />
          </Campo>
          <Campo
            etiqueta="Precio público (Q)"
            obligatorio
            ayuda={venta > 0 ? `Ganancia: ${formatoQuetzales(venta - costo)} por unidad` : undefined}
          >
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              className={claseInput}
              placeholder="0.00"
              value={formulario.precioVenta}
              onChange={(e) => cambiar('precioVenta', e.target.value)}
            />
          </Campo>
        </div>
      </div>

      {/* Primer lote: solo al crear */}
      {!editando && (
        <div className={`${claseTarjeta} space-y-4`}>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={conExistencias}
              onChange={(e) => setConExistencias(e.target.checked)}
            />
            Registrar existencias iniciales (primer lote)
          </label>
          {conExistencias && (
            <CamposEntrada formulario={entrada} onCambiar={cambiarEntrada} proveedores={proveedores} mostrarCosto />
          )}
        </div>
      )}

      {editando && (
        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          Las existencias no se editan aquí: se modifican con <b>Entrada de mercadería</b>, con las ventas o con un{' '}
          <b>Ajuste de lote</b>. Así cada unidad queda registrada en el kardex.
        </p>
      )}

      {error && <p className="rounded-lg bg-red-50 p-2.5 text-sm font-medium text-red-700">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onTerminar} className={claseBotonSecundario}>
          Cancelar
        </button>
        <button type="submit" className={claseBotonPrincipal}>
          Guardar
        </button>
      </div>
    </form>
  );
}
