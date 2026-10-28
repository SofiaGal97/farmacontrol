// ============================================================
// SERVICIO DE PRODUCTOS (catálogo de medicamentos)
// Única parte del sistema que crea, edita o elimina productos.
// Las unidades (stock) cambian con entradas, ventas y ajustes de lotes.
// ============================================================
import {
  collection,
  doc,
  onSnapshot,
  query,
  Timestamp,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { DatosEntrada, DatosProducto, Producto, Usuario } from '../modelos/tipos';
import { registrarEnBitacora } from './bitacora';
import { prepararEntrada } from './lotes';
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
      const productos = resultado.docs.map((d) => {
        const datos = d.data();
        // Valores por defecto para productos creados antes de agregar estos campos
        return { presentacion: '', codigo: '', ...datos, id: d.id } as Producto;
      });
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

/**
 * Registra un medicamento nuevo (solo administrador).
 * Si trae un primer ingreso de mercadería, se crea su lote en el mismo paso.
 */
export function crearProducto(datos: DatosProducto, primeraEntrada: DatosEntrada | null, usuario: Usuario) {
  const cambios = writeBatch(db);
  const refProducto = doc(coleccionProductos);

  cambios.set(refProducto, {
    ...datos,
    stock: primeraEntrada?.cantidad ?? 0,
    activo: true,
    creadoEn: Timestamp.now(),
    ...marcaDeCambio(usuario),
  });
  registrarEnBitacora(cambios, usuario, 'Producto creado', datos.nombre);

  if (primeraEntrada) {
    prepararEntrada(cambios, { id: refProducto.id, nombre: datos.nombre }, primeraEntrada, usuario);
  }

  guardarEnSegundoPlano(cambios, `crear ${datos.nombre}`);
}

/** Nombre de cada campo tal como se muestra en la bitácora */
const NOMBRE_CAMPO: Record<keyof DatosProducto, string> = {
  nombre: 'Nombre',
  componenteActivo: 'Componente',
  laboratorio: 'Laboratorio',
  tipo: 'Tipo',
  presentacion: 'Presentación',
  codigo: 'Código',
  stockMinimo: 'Stock mínimo',
  precioCosto: 'Precio costo',
  precioVenta: 'Precio público',
};

/** Modifica los datos de un medicamento (solo administrador) */
export function editarProducto(anterior: Producto, datos: DatosProducto, usuario: Usuario) {
  const cambios = writeBatch(db);
  cambios.update(doc(coleccionProductos, anterior.id), { ...datos, ...marcaDeCambio(usuario) });

  // Describimos en la bitácora qué campos cambiaron
  const diferencias = (Object.keys(datos) as (keyof DatosProducto)[])
    .filter((campo) => anterior[campo] !== datos[campo])
    .map((campo) => `${NOMBRE_CAMPO[campo]}: ${anterior[campo] || '(vacío)'} → ${datos[campo] || '(vacío)'}`);

  registrarEnBitacora(cambios, usuario, 'Producto editado', `${datos.nombre}. ${diferencias.join('; ') || 'Sin cambios'}`);
  guardarEnSegundoPlano(cambios, `editar ${datos.nombre}`);
}

/**
 * "Elimina" un producto. En realidad lo marca como inactivo para no
 * perder el historial de ventas y kardex (eliminación lógica).
 */
export function eliminarProducto(producto: Producto, usuario: Usuario) {
  const cambios = writeBatch(db);
  cambios.update(doc(coleccionProductos, producto.id), { activo: false, ...marcaDeCambio(usuario) });
  registrarEnBitacora(cambios, usuario, 'Producto eliminado', producto.nombre);
  guardarEnSegundoPlano(cambios, `eliminar ${producto.nombre}`);
}
