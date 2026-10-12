// ============================================================
// SERVICIO DE PRODUCTOS (inventario)
// Única parte del sistema que lee y escribe la colección "productos".
// ============================================================
import {
  collection,
  doc,
  increment,
  onSnapshot,
  query,
  Timestamp,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { DatosProducto, Producto, Usuario } from '../modelos/tipos';
import { registrarEnBitacora } from './bitacora';
import { guardarEnSegundoPlano } from './sincronizacion';

const coleccionProductos = collection(db, 'productos');

/**
 * Escucha EN TIEMPO REAL los productos activos.
 * Cada vez que cambian (en este celular o en otro) se llama a alRecibir.
 * Sin internet, entrega lo que hay guardado en el celular.
 */
export function escucharProductos(
  alRecibir: (productos: Producto[]) => void,
  alFallar: (error: Error) => void,
): Unsubscribe {
  const consulta = query(coleccionProductos, where('activo', '==', true));

  return onSnapshot(
    consulta,
    (resultado) => {
      const productos = resultado.docs.map((d) => ({ id: d.id, ...d.data() }) as Producto);
      productos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      alRecibir(productos);
    },
    alFallar,
  );
}

/** Campos de control que se agregan en cada cambio */
const marcaDeCambio = (usuario: Usuario) => ({
  actualizadoEn: Timestamp.now(),
  actualizadoPor: usuario.uid,
});

/** Registra un medicamento nuevo (solo administrador) */
export function crearProducto(datos: DatosProducto, usuario: Usuario) {
  const lote = writeBatch(db);
  lote.set(doc(coleccionProductos), {
    ...datos,
    activo: true,
    creadoEn: Timestamp.now(),
    ...marcaDeCambio(usuario),
  });
  registrarEnBitacora(lote, usuario, 'Producto creado', `${datos.nombre} (stock inicial: ${datos.stock})`);
  guardarEnSegundoPlano(lote, `crear ${datos.nombre}`);
}

/** Modifica los datos de un medicamento (solo administrador) */
export function editarProducto(anterior: Producto, datos: DatosProducto, usuario: Usuario) {
  const lote = writeBatch(db);
  lote.update(doc(coleccionProductos, anterior.id), { ...datos, ...marcaDeCambio(usuario) });

  // Describimos en la bitácora qué campos cambiaron
  const cambios = (Object.keys(datos) as (keyof DatosProducto)[])
    .filter((campo) => anterior[campo] !== datos[campo])
    .map((campo) => `${campo}: ${anterior[campo]} → ${datos[campo]}`);

  registrarEnBitacora(lote, usuario, 'Producto editado', `${datos.nombre}. ${cambios.join('; ') || 'Sin cambios'}`);
  guardarEnSegundoPlano(lote, `editar ${datos.nombre}`);
}

/**
 * Suma unidades al inventario (llegó mercadería).
 * Usamos increment(): Firestore SUMA en la nube en lugar de sobrescribir,
 * así dos celulares sin internet no se "pisan" los números.
 */
export function reabastecerProducto(
  producto: Producto,
  cantidad: number,
  nuevoVencimiento: string | null,
  usuario: Usuario,
) {
  const lote = writeBatch(db);
  lote.update(doc(coleccionProductos, producto.id), {
    stock: increment(cantidad),
    ...marcaDeCambio(usuario),
    // Solo si el lote nuevo trae otra fecha de vencimiento
    ...(nuevoVencimiento ? { vencimiento: nuevoVencimiento } : {}),
  });
  registrarEnBitacora(
    lote,
    usuario,
    'Reabastecimiento',
    `${producto.nombre}: +${cantidad} unidades` + (nuevoVencimiento ? `, vence ${nuevoVencimiento}` : ''),
  );
  guardarEnSegundoPlano(lote, `reabastecer ${producto.nombre}`);
}

/**
 * "Elimina" un producto. En realidad lo marca como inactivo para no
 * perder el historial de ventas que lo mencionan (eliminación lógica).
 */
export function eliminarProducto(producto: Producto, usuario: Usuario) {
  const lote = writeBatch(db);
  lote.update(doc(coleccionProductos, producto.id), { activo: false, ...marcaDeCambio(usuario) });
  registrarEnBitacora(lote, usuario, 'Producto eliminado', producto.nombre);
  guardarEnSegundoPlano(lote, `eliminar ${producto.nombre}`);
}
