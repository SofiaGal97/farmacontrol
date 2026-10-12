// ============================================================
// PÁGINA: AGREGAR / EDITAR PRODUCTO (solo administrador)
// ============================================================
import { useState, type FormEvent } from 'react';
import Campo from '../componentes/Campo';
import { claseBotonPrincipal, claseBotonSecundario, claseInput, claseTarjeta } from '../componentes/estilos';
import type { Producto } from '../modelos/tipos';
import { FORMULARIO_PRODUCTO_VACIO, validarProducto, type FormularioProducto } from '../logica/validaciones';
import { crearProducto, editarProducto } from '../servicios/productos';
import { mostrarAviso } from '../servicios/avisos';
import { usePerfil } from '../hooks/useSesion';
import { formatoQuetzales } from '../logica/formato';

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
    stock: String(p.stock),
    stockMinimo: String(p.stockMinimo),
    precioCosto: String(p.precioCosto),
    precioVenta: String(p.precioVenta),
    vencimiento: p.vencimiento,
  };
}

export default function PaginaProductoFormulario({ productoAEditar, onTerminar }: Props) {
  const perfil = usePerfil();
  const editando = Boolean(productoAEditar);
  const [formulario, setFormulario] = useState<FormularioProducto>(
    productoAEditar ? productoAFormulario(productoAEditar) : FORMULARIO_PRODUCTO_VACIO,
  );
  const [error, setError] = useState('');

  /** Actualiza un solo campo del formulario */
  const cambiar = (campo: keyof FormularioProducto, valor: string) =>
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));

  const manejarGuardar = (e: FormEvent) => {
    e.preventDefault();
    const resultado = validarProducto(formulario);
    if (resultado.valido === false) {
      setError(resultado.error);
      return;
    }

    if (productoAEditar) {
      editarProducto(productoAEditar, resultado.datos, perfil);
      mostrarAviso(`"${resultado.datos.nombre}" actualizado`);
    } else {
      crearProducto(resultado.datos, perfil);
      mostrarAviso(`"${resultado.datos.nombre}" agregado al inventario`);
    }
    onTerminar();
  };

  // Ganancia por unidad (se muestra mientras se escribe)
  const costo = Number(formulario.precioCosto) || 0;
  const venta = Number(formulario.precioVenta) || 0;
  const gananciaUnidad = venta - costo;

  return (
    <form onSubmit={manejarGuardar} className={`${claseTarjeta} space-y-4`}>
      <h2 className="text-lg font-bold text-slate-800">
        {editando ? '✏️ Editar medicamento' : '➕ Registrar medicamento'}
      </h2>

      <Campo etiqueta="Nombre comercial" obligatorio>
        <input
          className={claseInput}
          placeholder="Ej. Panadol Forte"
          value={formulario.nombre}
          onChange={(e) => cambiar('nombre', e.target.value)}
        />
      </Campo>

      <Campo etiqueta="Componente activo" ayuda="Opcional. Ej. Paracetamol">
        <input
          className={claseInput}
          placeholder="Ej. Paracetamol"
          value={formulario.componenteActivo}
          onChange={(e) => cambiar('componenteActivo', e.target.value)}
        />
      </Campo>

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
        <Campo etiqueta={editando ? 'Stock actual' : 'Stock inicial'} obligatorio>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            className={claseInput}
            placeholder="0"
            value={formulario.stock}
            onChange={(e) => cambiar('stock', e.target.value)}
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
        <Campo etiqueta="Precio público (Q)" obligatorio ayuda={venta > 0 ? `Ganancia: ${formatoQuetzales(gananciaUnidad)} c/u` : undefined}>
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

      <Campo etiqueta="Fecha de vencimiento" obligatorio ayuda="Se avisará 3 meses antes de que venza">
        <input
          type="date"
          className={claseInput}
          value={formulario.vencimiento}
          onChange={(e) => cambiar('vencimiento', e.target.value)}
        />
      </Campo>

      {error && <p className="rounded-lg bg-red-50 p-2.5 text-sm font-medium text-red-700">{error}</p>}

      <div className="grid grid-cols-2 gap-3 pt-2">
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
