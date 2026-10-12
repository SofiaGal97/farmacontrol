// ============================================================
// CAPA DE MODELOS
// Describe la forma de cada dato que guarda el sistema.
// Cada "interface" equivale a una colección de la base de datos.
// ============================================================

/** Tipos de usuario del sistema */
export type Rol = 'admin' | 'empleado';

/** Colección "usuarios": una persona que puede entrar al sistema */
export interface Usuario {
  uid: string; // identificador que da Firebase Authentication
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean; // si es false, ya no puede usar el sistema
}

/** Ético = de patente / marca original. Genérico = mismo componente, sin marca */
export type TipoMedicamento = 'Etico' | 'Generico';

/** Colección "productos": un medicamento del inventario */
export interface Producto {
  id: string;
  nombre: string; // nombre comercial, ej. "Panadol Forte"
  componenteActivo: string; // ej. "Paracetamol" (puede ir vacío)
  laboratorio: string; // ej. "Bayer"
  tipo: TipoMedicamento;
  stock: number; // unidades disponibles
  stockMinimo: number; // al llegar a esta cantidad se muestra alerta
  precioCosto: number; // lo que se le paga al proveedor
  precioVenta: number; // precio al público
  vencimiento: string; // fecha en formato AAAA-MM-DD
  activo: boolean; // false = eliminado (se conserva para el historial)
}

/** Datos que se capturan en el formulario de producto */
export type DatosProducto = Omit<Producto, 'id' | 'activo'>;

/** Una línea dentro de una venta */
export interface ItemVenta {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioVenta: number;
  precioCosto: number;
  subtotal: number;
}

/** Colección "ventas": una venta registrada (no se puede modificar) */
export interface Venta {
  id: string;
  fecha: Date;
  items: ItemVenta[];
  total: number;
  ganancia: number;
  vendedorUid: string;
  vendedorNombre: string;
}

/** Producto + cantidad dentro de la canasta (antes de cobrar) */
export interface ItemCarrito {
  productoId: string;
  cantidad: number;
}

/** Colección "bitacora": quién hizo qué y cuándo */
export interface RegistroBitacora {
  id: string;
  fecha: Date;
  usuarioUid: string;
  usuarioNombre: string;
  accion: string;
  detalle: string;
}
