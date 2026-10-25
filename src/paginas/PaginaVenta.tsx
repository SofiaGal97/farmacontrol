// ============================================================
// PÁGINA: VENDER
// 1) Buscar el medicamento  2) Agregarlo a la canasta
// 3) Ajustar cantidades     4) Cobrar (descuenta de los lotes por FEFO)
// 5) Descargar el comprobante
// ============================================================
import { useState } from 'react';
import Icono from '../componentes/Icono';
import InsigniasAlerta from '../componentes/InsigniasAlerta';
import Modal from '../componentes/Modal';
import { claseBotonPrincipal, claseBotonSecundario, claseInput, claseTarjeta, claseTituloSeccion } from '../componentes/estilos';
import type { ItemCarrito, Producto, Venta } from '../modelos/tipos';
import { lotesDeProducto, unidadesVendibles } from '../logica/alertas';
import { formatoQuetzales, normalizarTexto } from '../logica/formato';
import { registrarVenta } from '../servicios/ventas';
import { descargarComprobante } from '../servicios/reportesPdf';
import { mostrarAviso } from '../servicios/avisos';
import { useLotes, useProductos } from '../hooks/useDatos';
import { usePerfil } from '../hooks/useSesion';

export default function PaginaVenta() {
  const perfil = usePerfil();
  const { datos: productos } = useProductos();
  const { datos: lotes } = useLotes();
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [ventaRealizada, setVentaRealizada] = useState<Venta | null>(null);

  // Buscamos siempre el producto "fresco" (con el stock actualizado)
  const buscarProducto = (id: string) => productos.find((p) => p.id === id);
  // Unidades que se pueden vender = las de lotes NO vencidos
  const disponibles = (producto: Producto) => unidadesVendibles(lotesDeProducto(producto, lotes));

  // ---- Resultados del buscador ----
  const texto = normalizarTexto(busqueda);
  const resultados =
    texto === ''
      ? []
      : productos
          .filter(
            (p) =>
              normalizarTexto(p.nombre).includes(texto) ||
              normalizarTexto(p.componenteActivo).includes(texto) ||
              normalizarTexto(p.codigo).includes(texto),
          )
          .slice(0, 15);

  // ---- Canasta ----
  const agregarAlCarrito = (producto: Producto) => {
    const vendibles = disponibles(producto);
    if (vendibles <= 0) {
      const motivo = producto.stock > 0 ? 'solo tiene unidades VENCIDAS' : 'está agotado';
      mostrarAviso(`${producto.nombre} ${motivo}. No se puede vender.`, 'error');
      return;
    }

    const existente = carrito.find((i) => i.productoId === producto.id);
    if (existente) {
      if (existente.cantidad >= vendibles) {
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
        if (nueva < 1 || (producto && nueva > disponibles(producto))) return i;
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

  // ¿Algún producto dejó de tener unidades suficientes (otro dispositivo lo vendió)?
  const problemas = lineas.filter((l) => l.item.cantidad > disponibles(l.producto));

  const cobrar = () => {
    if (lineas.length === 0) return;
    if (problemas.length > 0) {
      mostrarAviso('Revisa la canasta: hay productos sin existencias suficientes.', 'error');
      return;
    }
    if (!confirm(`¿Registrar venta por ${formatoQuetzales(total)}?`)) return;

    try {
      const venta = registrarVenta(
        lineas.map((l) => l.item),
        productos,
        lotes,
        perfil,
      );
      setCarrito([]);
      setVentaRealizada(venta);
    } catch (error) {
      mostrarAviso((error as Error).message, 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Buscador */}
      <div className={claseTarjeta}>
        <h2 className={claseTituloSeccion}>Buscar medicamento</h2>
        <input
          type="search"
          placeholder="Nombre, componente o código…"
          className={claseInput}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        {resultados.length > 0 && (
          <div className="mt-3 max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50">
            {resultados.map((producto) => {
              const vendibles = disponibles(producto);
              return (
                <button
                  key={producto.id}
                  onClick={() => agregarAlCarrito(producto)}
                  className={`flex w-full items-center justify-between gap-2 p-3 text-left text-sm active:bg-blue-50 ${
                    vendibles > 0 ? '' : 'opacity-50'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="block font-bold text-slate-700">{producto.nombre}</span>
                    {(producto.componenteActivo || producto.presentacion) && (
                      <span className="block text-xs italic text-slate-400">
                        {[producto.componenteActivo, producto.presentacion].filter(Boolean).join(' · ')}
                      </span>
                    )}
                    <InsigniasAlerta producto={producto} lotesDelProducto={lotesDeProducto(producto, lotes)} />
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="block font-bold text-green-600">{formatoQuetzales(producto.precioVenta)}</span>
                    <span className="text-[11px] text-slate-500">Disp: {vendibles} u.</span>
                  </div>
                </button>
              );
            })}
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
            {lineas.map(({ item, producto }) => {
              const vendibles = disponibles(producto);
              return (
                <div key={item.productoId} className="flex items-center justify-between gap-2 py-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-bold text-slate-800">{producto.nombre}</h4>
                    <span className="text-xs text-slate-400">
                      {formatoQuetzales(producto.precioVenta)} c/u · Subtotal{' '}
                      <b className="text-slate-600">{formatoQuetzales(producto.precioVenta * item.cantidad)}</b>
                    </span>
                    {item.cantidad > vendibles && (
                      <span className="block text-[11px] font-bold text-red-600">Solo hay {vendibles} u. disponibles</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BotonCantidad onClick={() => cambiarCantidad(item.productoId, -1)}>−</BotonCantidad>
                    <span className="w-7 text-center text-sm font-bold">{item.cantidad}</span>
                    <BotonCantidad onClick={() => cambiarCantidad(item.productoId, 1)} deshabilitado={item.cantidad >= vendibles}>
                      +
                    </BotonCantidad>
                    <button onClick={() => quitarDelCarrito(item.productoId)} className="ml-1 p-1 text-red-500" aria-label="Quitar">
                      <Icono nombre="basura" className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              );
            })}

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
                <span className="inline-flex items-center justify-center gap-2">
                  <Icono nombre="dinero" /> Registrar y cobrar venta
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Venta realizada: comprobante */}
      {ventaRealizada && (
        <Modal titulo="Venta registrada" onCerrar={() => setVentaRealizada(null)}>
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Icono nombre="activado" className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Comprobante {ventaRealizada.numero}</p>
              <p className="text-3xl font-black text-slate-800">{formatoQuetzales(ventaRealizada.total)}</p>
            </div>
            <button onClick={() => descargarComprobante(ventaRealizada)} className={claseBotonPrincipal}>
              <span className="inline-flex items-center justify-center gap-2">
                <Icono nombre="recibo" /> Descargar comprobante (PDF)
              </span>
            </button>
            <button onClick={() => setVentaRealizada(null)} className={claseBotonSecundario}>
              Nueva venta
            </button>
          </div>
        </Modal>
      )}
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
