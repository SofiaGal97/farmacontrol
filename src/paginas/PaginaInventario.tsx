// ============================================================
// PÁGINA: INVENTARIO
// Lista de medicamentos con buscador, alertas de stock bajo y de
// vencimiento, reabastecimiento y (solo admin) agregar/editar/eliminar.
// ============================================================
import { useState, type FormEvent } from 'react';
import Campo from '../componentes/Campo';
import InsigniasAlerta from '../componentes/InsigniasAlerta';
import Modal from '../componentes/Modal';
import { claseBotonPrincipal, claseBotonSecundario, claseInput, claseTituloSeccion } from '../componentes/estilos';
import type { Producto } from '../modelos/tipos';
import { estadoStock, estadoVencimiento, resumirAlertas } from '../logica/alertas';
import { formatoFechaTexto, formatoQuetzales, normalizarTexto } from '../logica/formato';
import { eliminarProducto, reabastecerProducto } from '../servicios/productos';
import { mostrarAviso } from '../servicios/avisos';
import { useProductos } from '../hooks/useDatos';
import { usePerfil } from '../hooks/useSesion';
import PaginaProductoFormulario from './PaginaProductoFormulario';
import Icono from '../componentes/Icono';

type Filtro = 'todos' | 'stock_bajo' | 'por_vencer' | 'vencidos';

/** Qué se está mostrando: la lista, el formulario de nuevo o el de edición */
type Vista = { tipo: 'lista' } | { tipo: 'nuevo' } | { tipo: 'editar'; producto: Producto };

export default function PaginaInventario() {
  const perfil = usePerfil();
  const esAdmin = perfil.rol === 'admin';
  const { datos: productos, cargando, error } = useProductos();

  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [vista, setVista] = useState<Vista>({ tipo: 'lista' });
  const [aReabastecer, setAReabastecer] = useState<Producto | null>(null);

  // ---- Formularios de agregar / editar ----
  if (vista.tipo === 'nuevo') {
    return <PaginaProductoFormulario onTerminar={() => setVista({ tipo: 'lista' })} />;
  }
  if (vista.tipo === 'editar') {
    return <PaginaProductoFormulario productoAEditar={vista.producto} onTerminar={() => setVista({ tipo: 'lista' })} />;
  }

  // ---- Alertas y filtros ----
  const alertas = resumirAlertas(productos);
  const listaSegunFiltro: Record<Filtro, Producto[]> = {
    todos: productos,
    stock_bajo: alertas.stockBajo,
    por_vencer: alertas.porVencer,
    vencidos: alertas.vencidos,
  };

  const texto = normalizarTexto(busqueda);
  const visibles = listaSegunFiltro[filtro].filter(
    (p) =>
      normalizarTexto(p.nombre).includes(texto) ||
      normalizarTexto(p.componenteActivo).includes(texto) ||
      normalizarTexto(p.laboratorio).includes(texto),
  );

  const manejarEliminar = (producto: Producto) => {
    if (!confirm(`¿Eliminar "${producto.nombre}" del inventario?`)) return;
    eliminarProducto(producto, perfil);
    mostrarAviso(`"${producto.nombre}" eliminado`);
  };

  return (
    <div className="space-y-4">
      {/* Tarjetas de alertas (tocar una filtra la lista) */}
      <div className="grid grid-cols-3 gap-2">
        <TarjetaAlerta
          cantidad={alertas.stockBajo.length}
          texto="Stock bajo"
          color="red"
          activa={filtro === 'stock_bajo'}
          onClick={() => setFiltro(filtro === 'stock_bajo' ? 'todos' : 'stock_bajo')}
        />
        <TarjetaAlerta
          cantidad={alertas.porVencer.length}
          texto="Por vencer (3 meses)"
          color="amber"
          activa={filtro === 'por_vencer'}
          onClick={() => setFiltro(filtro === 'por_vencer' ? 'todos' : 'por_vencer')}
        />
        <TarjetaAlerta
          cantidad={alertas.vencidos.length}
          texto="Vencidos"
          color="rose"
          activa={filtro === 'vencidos'}
          onClick={() => setFiltro(filtro === 'vencidos' ? 'todos' : 'vencidos')}
        />
      </div>

      <input
        type="search"
        placeholder="Buscar por nombre, componente o laboratorio…"
        className={`${claseInput} p-3 shadow-sm`}
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      {esAdmin && (
        <button onClick={() => setVista({ tipo: 'nuevo' })} className={claseBotonPrincipal}>
          <span className="inline-flex items-center justify-center gap-2"><Icono nombre="mas" /> Agregar medicamento</span>
        </button>
      )}

      <div className="flex items-center justify-between">
        <h2 className={claseTituloSeccion + ' mb-0'}>
          {filtro === 'todos' ? 'Todos los productos' : 'Filtrado por alerta'} ({visibles.length})
        </h2>
        {filtro !== 'todos' && (
          <button onClick={() => setFiltro('todos')} className="text-xs font-semibold text-blue-600">
            Ver todos
          </button>
        )}
      </div>

      {cargando && <p className="py-8 text-center text-sm text-slate-400">Cargando inventario…</p>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="space-y-3">
        {visibles.map((producto) => (
          <TarjetaProducto
            key={producto.id}
            producto={producto}
            esAdmin={esAdmin}
            onReabastecer={() => setAReabastecer(producto)}
            onEditar={() => setVista({ tipo: 'editar', producto })}
            onEliminar={() => manejarEliminar(producto)}
          />
        ))}

        {!cargando && visibles.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">
            {productos.length === 0
              ? esAdmin
                ? 'El inventario está vacío. Toca "Agregar medicamento" para empezar.'
                : 'El inventario está vacío.'
              : 'No hay productos que coincidan.'}
          </p>
        )}
      </div>

      {aReabastecer && (
        <ModalReabastecer producto={aReabastecer} onCerrar={() => setAReabastecer(null)} />
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Componentes internos de esta página
// ------------------------------------------------------------

const COLORES_ALERTA = {
  red: { normal: 'border-red-200 bg-red-50 text-red-600', activa: 'border-red-500 bg-red-100 ring-2 ring-red-400 text-red-700' },
  amber: { normal: 'border-amber-200 bg-amber-50 text-amber-600', activa: 'border-amber-500 bg-amber-100 ring-2 ring-amber-400 text-amber-700' },
  rose: { normal: 'border-rose-200 bg-rose-50 text-rose-700', activa: 'border-rose-500 bg-rose-100 ring-2 ring-rose-400 text-rose-800' },
};

function TarjetaAlerta(props: {
  cantidad: number;
  texto: string;
  color: keyof typeof COLORES_ALERTA;
  activa: boolean;
  onClick: () => void;
}) {
  const colores = COLORES_ALERTA[props.color];
  return (
    <button
      onClick={props.onClick}
      className={`rounded-xl border p-2.5 text-center transition-all ${props.activa ? colores.activa : colores.normal}`}
    >
      <span className="block text-2xl font-black">{props.cantidad}</span>
      <span className="block text-[11px] font-semibold leading-tight text-slate-600">{props.texto}</span>
    </button>
  );
}

function TarjetaProducto(props: {
  producto: Producto;
  esAdmin: boolean;
  onReabastecer: () => void;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  const { producto, esAdmin } = props;
  const stock = estadoStock(producto);
  const vencido = estadoVencimiento(producto) === 'vencido';

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm ${
        vencido || stock === 'agotado' ? 'border-red-300' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="font-bold text-slate-800">{producto.nombre}</h3>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                producto.tipo === 'Generico' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
              }`}
            >
              {producto.tipo === 'Generico' ? 'Genérico' : 'Ético'}
            </span>
          </div>
          {producto.componenteActivo && <p className="text-xs italic text-slate-500">{producto.componenteActivo}</p>}
          <p className="text-xs text-slate-400">
            Lab: {producto.laboratorio} · Vence: {formatoFechaTexto(producto.vencimiento)}
          </p>
          <p className="text-xs text-slate-500">
            Precio: <b>{formatoQuetzales(producto.precioVenta)}</b>
            {esAdmin && <> · Costo: {formatoQuetzales(producto.precioCosto)}</>}
          </p>
          <div className="mt-1.5">
            <InsigniasAlerta producto={producto} />
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              stock === 'normal' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {producto.stock} u.
          </span>
          <button
            onClick={props.onReabastecer}
            className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-600 active:scale-95"
          >
            + Stock
          </button>
        </div>
      </div>

      {esAdmin && (
        <div className="mt-3 flex gap-2 border-t border-slate-100 pt-2">
          <button onClick={props.onEditar} className="flex-1 rounded-lg py-1.5 text-xs font-semibold text-slate-600 active:bg-slate-100">
            <span className="inline-flex items-center justify-center gap-1.5"><Icono nombre="editar" className="h-4 w-4" /> Editar</span>
          </button>
          <button onClick={props.onEliminar} className="flex-1 rounded-lg py-1.5 text-xs font-semibold text-red-600 active:bg-red-50">
            <span className="inline-flex items-center justify-center gap-1.5"><Icono nombre="basura" className="h-4 w-4" /> Eliminar</span>
          </button>
        </div>
      )}
    </div>
  );
}

function ModalReabastecer({ producto, onCerrar }: { producto: Producto; onCerrar: () => void }) {
  const perfil = usePerfil();
  const [cantidad, setCantidad] = useState('');
  const [nuevoVencimiento, setNuevoVencimiento] = useState('');
  const [error, setError] = useState('');

  const manejarGuardar = (e: FormEvent) => {
    e.preventDefault();
    const unidades = parseInt(cantidad, 10);
    if (!/^\d+$/.test(cantidad) || unidades <= 0) {
      setError('Ingresa una cantidad mayor a 0.');
      return;
    }
    reabastecerProducto(producto, unidades, nuevoVencimiento || null, perfil);
    mostrarAviso(`+${unidades} unidades de ${producto.nombre}`);
    onCerrar();
  };

  return (
    <Modal titulo="Reabastecer stock" onCerrar={onCerrar}>
      <p className="font-semibold text-slate-700">{producto.nombre}</p>
      <p className="mb-4 text-xs text-slate-400">
        Stock actual: <b>{producto.stock} u.</b> · Vence: {formatoFechaTexto(producto.vencimiento)}
      </p>

      <form onSubmit={manejarGuardar} className="space-y-4">
        <Campo etiqueta="Unidades que ingresan" obligatorio>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            autoFocus
            className={claseInput}
            placeholder="Ej. 12"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Nueva fecha de vencimiento" ayuda="Opcional: llénala si el lote nuevo vence en otra fecha">
          <input
            type="date"
            className={claseInput}
            value={nuevoVencimiento}
            onChange={(e) => setNuevoVencimiento(e.target.value)}
          />
        </Campo>

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onCerrar} className={claseBotonSecundario}>
            Cancelar
          </button>
          <button type="submit" className={claseBotonPrincipal}>
            Sumar
          </button>
        </div>
      </form>
    </Modal>
  );
}
