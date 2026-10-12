// ============================================================
// PÁGINA: VENDER
// 1) Buscar el medicamento  2) Agregarlo a la canasta
// 3) Ajustar cantidades     4) Cobrar (descuenta el stock)
// ============================================================
import { useState } from 'react';
import InsigniasAlerta from '../componentes/InsigniasAlerta';
import { claseInput, claseTarjeta, claseTituloSeccion } from '../componentes/estilos';
import type { ItemCarrito, Producto } from '../modelos/tipos';
import { puedeVenderse, estadoVencimiento } from '../logica/alertas';
import { formatoQuetzales, normalizarTexto } from '../logica/formato';
import { registrarVenta } from '../servicios/ventas';
import { mostrarAviso } from '../servicios/avisos';
import { useProductos } from '../hooks/useDatos';
import { usePerfil } from '../hooks/useSesion';
import Icono from '../componentes/Icono';

export default function PaginaVenta() {
  const perfil = usePerfil();
  const { datos: productos } = useProductos();
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);

  // Buscamos siempre el producto "fresco" (con el stock actualizado)
  const buscarProducto = (id: string) => productos.find((p) => p.id === id);

  // ---- Resultados del buscador ----
  const texto = normalizarTexto(busqueda);
  const resultados =
    texto === ''
      ? []
      : productos
          .filter(
            (p) => normalizarTexto(p.nombre).includes(texto) || normalizarTexto(p.componenteActivo).includes(texto),
          )
          .slice(0, 15);

  // ---- Canasta ----
  const agregarAlCarrito = (producto: Producto) => {
    if (estadoVencimiento(producto) === 'vencido') {
      mostrarAviso(`${producto.nombre} está VENCIDO. No se puede vender.`, 'error');
      return;
    }
    if (producto.stock <= 0) {
      mostrarAviso(`${producto.nombre} está agotado.`, 'error');
      return;
    }

    const existente = carrito.find((i) => i.productoId === producto.id);
    if (existente) {
      if (existente.cantidad >= producto.stock) {
        mostrarAviso('No hay más unidades disponibles de este producto.', 'error');
        return;
      }
      setCarrito(carrito.map((i) => (i.productoId === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i)));
    } else {
      setCarrito([...carrito, { productoId: producto.id, cantidad: 1 }]);
    }
    setBusqueda('');
  };

  const cambiarCantidad = (productoId: string, cambio: number) => {
    const producto = buscarProducto(productoId);
    setCarrito(
      carrito.map((i) => {
        if (i.productoId !== productoId) return i;
        const nueva = i.cantidad + cambio;
        if (nueva < 1 || (producto && nueva > producto.stock)) return i;
        return { ...i, cantidad: nueva };
      }),
    );
  };

  const quitarDelCarrito = (productoId: string) => setCarrito(carrito.filter((i) => i.productoId !== productoId));

  // Líneas de la canasta con los datos del producto
  const lineas = carrito
    .map((item) => ({ item, producto: buscarProducto(item.productoId) }))
    .filter((l): l is { item: ItemCarrito; producto: Producto } => Boolean(l.producto));

  const total = lineas.reduce((suma, l) => suma + l.producto.precioVenta * l.item.cantidad, 0);

  // ¿Algún producto de la canasta dejó de estar disponible (otro dispositivo lo vendió)?
  const problemas = lineas.filter((l) => !puedeVenderse(l.producto) || l.item.cantidad > l.producto.stock);

  const cobrar = () => {
    if (lineas.length === 0) return;
    if (problemas.length > 0) {
      mostrarAviso('Revisa la canasta: hay productos sin existencias suficientes.', 'error');
      return;
    }
    if (!confirm(`¿Registrar venta por ${formatoQuetzales(total)}?`)) return;

    const resultado = registrarVenta(
      lineas.map((l) => l.item),
      productos,
      perfil,
    );
    mostrarAviso(`Venta registrada: ${formatoQuetzales(resultado.total)}`);
    setCarrito([]);
  };

  return (
    <div className="space-y-4">
      {/* 1. Buscador */}
      <div className={claseTarjeta}>
        <h2 className={claseTituloSeccion}>Buscar medicamento</h2>
        <input
          type="search"
          placeholder="Ej. Paracetamol o Panadol…"
          className={claseInput}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        {resultados.length > 0 && (
          <div className="mt-3 max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50">
            {resultados.map((producto) => (
              <button
                key={producto.id}
                onClick={() => agregarAlCarrito(producto)}
                className={`flex w-full items-center justify-between gap-2 p-3 text-left text-sm active:bg-blue-50 ${
                  puedeVenderse(producto) ? '' : 'opacity-50'
                }`}
              >
                <div className="min-w-0">
                  <span className="block font-bold text-slate-700">{producto.nombre}</span>
                  {producto.componenteActivo && (
                    <span className="block text-xs italic text-slate-400">{producto.componenteActivo}</span>
                  )}
                  <InsigniasAlerta producto={producto} />
                </div>
                <div className="shrink-0 text-right">
                  <span className="block font-bold text-green-600">{formatoQuetzales(producto.precioVenta)}</span>
                  <span className="text-[11px] text-slate-500">Disp: {producto.stock} u.</span>
                </div>
              </button>
            ))}
          </div>
        )}
        {texto !== '' && resultados.length === 0 && (
          <p className="mt-3 text-center text-xs text-slate-400">No se encontraron productos.</p>
        )}
      </div>

      {/* 2. Canasta */}
      <div className={claseTarjeta}>
        <h2 className={claseTituloSeccion}>Canasta ({lineas.length})</h2>

        {lineas.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Busca un producto arriba para agregarlo.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {lineas.map(({ item, producto }) => (
              <div key={item.productoId} className="flex items-center justify-between gap-2 py-3">
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-bold text-slate-800">{producto.nombre}</h4>
                  <span className="text-xs text-slate-400">
                    {formatoQuetzales(producto.precioVenta)} c/u · Subtotal{' '}
                    <b className="text-slate-600">{formatoQuetzales(producto.precioVenta * item.cantidad)}</b>
                  </span>
                  {item.cantidad > producto.stock && (
                    <span className="block text-[11px] font-bold text-red-600">Solo hay {producto.stock} u.</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <BotonCantidad onClick={() => cambiarCantidad(item.productoId, -1)}>−</BotonCantidad>
                  <span className="w-7 text-center text-sm font-bold">{item.cantidad}</span>
                  <BotonCantidad onClick={() => cambiarCantidad(item.productoId, 1)} deshabilitado={item.cantidad >= producto.stock}>
                    +
                  </BotonCantidad>
                  <button onClick={() => quitarDelCarrito(item.productoId)} className="ml-1 p-1 text-red-500" aria-label="Quitar">
                    <Icono nombre="basura" className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}

            {/* 3. Total y cobrar */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Total a cobrar:</span>
                <span className="text-2xl font-black text-slate-800">{formatoQuetzales(total)}</span>
              </div>
              <button
                onClick={cobrar}
                disabled={problemas.length > 0}
                className="w-full rounded-xl bg-green-600 p-3.5 text-base font-black text-white shadow-lg transition-all hover:bg-green-700 active:scale-[0.98] disabled:opacity-50"
              >
                <span className="inline-flex items-center justify-center gap-2"><Icono nombre="dinero" /> Registrar y cobrar venta</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BotonCantidad(props: { onClick: () => void; deshabilitado?: boolean; children: string }) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.deshabilitado}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 font-bold text-slate-600 active:bg-slate-200 disabled:opacity-40"
    >
      {props.children}
    </button>
  );
}
