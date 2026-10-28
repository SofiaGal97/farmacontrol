// ============================================================
// PÁGINA: INVENTARIO
// Lista de medicamentos con buscador y alertas de stock bajo,
// lotes por vencer y lotes vencidos. Al tocar un producto se abre
// su detalle (lotes, entradas, ajustes y kardex).
// ============================================================
import { useEffect, useState } from 'react';
import Icono from '../componentes/Icono';
import InsigniasAlerta from '../componentes/InsigniasAlerta';
import { claseBotonPrincipal, claseInput, claseTituloSeccion } from '../componentes/estilos';
import type { Producto } from '../modelos/tipos';
import { estadoStock, lotesDeProducto, resumirAlertas } from '../logica/alertas';
import { formatoQuetzales, normalizarTexto } from '../logica/formato';
import { eliminarProducto } from '../servicios/productos';
import { mostrarAviso } from '../servicios/avisos';
import { useLotes, useProductos } from '../hooks/useDatos';
import { usePerfil } from '../hooks/useSesion';
import PaginaProductoFormulario from './PaginaProductoFormulario';
import PaginaDetalleProducto from './PaginaDetalleProducto';

type Filtro = 'todos' | 'stock_bajo' | 'por_vencer' | 'vencidos';

/** Qué se está mostrando: la lista, un detalle o un formulario */
type Vista =
  | { tipo: 'lista' }
  | { tipo: 'nuevo' }
  | { tipo: 'detalle'; productoId: string }
  | { tipo: 'editar'; productoId: string };

export default function PaginaInventario() {
  const perfil = usePerfil();
  const esAdmin = perfil.rol === 'admin';
  const { datos: productos, cargando, error } = useProductos();
  const { datos: lotes } = useLotes();

  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [vista, setVista] = useState<Vista>({ tipo: 'lista' });

  const irALista = () => setVista({ tipo: 'lista' });

  // Al cambiar de pantalla se empieza desde arriba
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [vista]);

  // ---- Formulario y detalle (buscamos el producto "fresco" para ver cambios en vivo) ----
  if (vista.tipo === 'nuevo') return <PaginaProductoFormulario onTerminar={irALista} />;

  if (vista.tipo === 'editar' || vista.tipo === 'detalle') {
    const producto = productos.find((p) => p.id === vista.productoId);
    if (!producto) return <BotonVolverSinProducto onVolver={irALista} />;

    if (vista.tipo === 'editar') {
      return (
        <PaginaProductoFormulario
          productoAEditar={producto}
          onTerminar={() => setVista({ tipo: 'detalle', productoId: producto.id })}
        />
      );
    }
    return (
      <PaginaDetalleProducto
        producto={producto}
        lotes={lotes}
        onVolver={irALista}
        onEditar={() => setVista({ tipo: 'editar', productoId: producto.id })}
        onEliminar={() => {
          if (producto.stock > 0 && !confirm(`"${producto.nombre}" todavía tiene ${producto.stock} unidades. ¿Eliminarlo de todos modos?`)) return;
          if (!confirm(`¿Eliminar "${producto.nombre}" del inventario? Su historial se conserva.`)) return;
          eliminarProducto(producto, perfil);
          mostrarAviso(`"${producto.nombre}" eliminado`);
          irALista();
        }}
      />
    );
  }

  // ---- Alertas y filtros ----
  const alertas = resumirAlertas(productos, lotes);
  const conLotePorVencer = new Set(alertas.porVencer.map((l) => l.productoId));
  const conLoteVencido = new Set(alertas.vencidos.map((l) => l.productoId));

  const listaSegunFiltro: Record<Filtro, Producto[]> = {
    todos: productos,
    stock_bajo: alertas.stockBajo,
    por_vencer: productos.filter((p) => conLotePorVencer.has(p.id)),
    vencidos: productos.filter((p) => conLoteVencido.has(p.id)),
  };

  const texto = normalizarTexto(busqueda);
  const visibles = listaSegunFiltro[filtro].filter(
    (p) =>
      normalizarTexto(p.nombre).includes(texto) ||
      normalizarTexto(p.componenteActivo).includes(texto) ||
      normalizarTexto(p.laboratorio).includes(texto) ||
      normalizarTexto(p.codigo).includes(texto),
  );

  const alternarFiltro = (nuevo: Filtro) => setFiltro(filtro === nuevo ? 'todos' : nuevo);

  return (
    <div className="space-y-4">
      {/* Tarjetas de alertas (tocar una filtra la lista) */}
      <div className="grid grid-cols-3 gap-2">
        <TarjetaAlerta cantidad={alertas.stockBajo.length} texto="Stock bajo" color="red" activa={filtro === 'stock_bajo'} onClick={() => alternarFiltro('stock_bajo')} />
        <TarjetaAlerta cantidad={conLotePorVencer.size} texto="Por vencer (3 meses)" color="amber" activa={filtro === 'por_vencer'} onClick={() => alternarFiltro('por_vencer')} />
        <TarjetaAlerta cantidad={conLoteVencido.size} texto="Con vencidos" color="rose" activa={filtro === 'vencidos'} onClick={() => alternarFiltro('vencidos')} />
      </div>

      <input
        type="search"
        placeholder="Buscar por nombre, componente, laboratorio o código…"
        className={`${claseInput} p-3 shadow-sm`}
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      {esAdmin && (
        <button onClick={() => setVista({ tipo: 'nuevo' })} className={claseBotonPrincipal}>
          <span className="inline-flex items-center justify-center gap-2">
            <Icono nombre="mas" /> Agregar medicamento
          </span>
        </button>
      )}

      <div className="flex items-center justify-between">
        <h2 className={`${claseTituloSeccion} mb-0`}>
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
          <button
            key={producto.id}
            onClick={() => setVista({ tipo: 'detalle', productoId: producto.id })}
            className="block w-full text-left"
          >
            <TarjetaProducto producto={producto} lotesDelProducto={lotesDeProducto(producto, lotes)} />
          </button>
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
    </div>
  );
}

// ------------------------------------------------------------
// Componentes internos de esta página
// ------------------------------------------------------------

function BotonVolverSinProducto({ onVolver }: { onVolver: () => void }) {
  return (
    <div className="space-y-3 py-8 text-center">
      <p className="text-sm text-slate-500">Este producto ya no existe o fue eliminado.</p>
      <button onClick={onVolver} className="text-sm font-semibold text-blue-600">
        Volver al inventario
      </button>
    </div>
  );
}

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

function TarjetaProducto({ producto, lotesDelProducto }: { producto: Producto; lotesDelProducto: ReturnType<typeof lotesDeProducto> }) {
  const stock = estadoStock(producto);

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50">
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
        <p className="truncate text-xs text-slate-500">
          {[producto.componenteActivo, producto.presentacion, producto.laboratorio].filter(Boolean).join(' · ')}
        </p>
        <p className="text-xs text-slate-500">
          {formatoQuetzales(producto.precioVenta)} · {lotesDelProducto.length} lote{lotesDelProducto.length === 1 ? '' : 's'}
        </p>
        <div className="mt-1.5">
          <InsigniasAlerta producto={producto} lotesDelProducto={lotesDelProducto} />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            stock === 'normal' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {producto.stock} u.
        </span>
        <Icono nombre="siguiente" className="h-4 w-4 text-slate-300" />
      </div>
    </div>
  );
}
