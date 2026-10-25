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
  usuario?: string; // nombre de usuario para entrar, ej. "ventas1"
  correo: string; // correo real o interno (ver logica/nombreUsuario.ts)
  rol: Rol;
  activo: boolean; // si es false, ya no puede usar el sistema
}

/** Ético = de patente / marca original. Genérico = mismo componente, sin marca */
export type TipoMedicamento = 'Etico' | 'Generico';

/** Colección "productos": un medicamento del catálogo */
export interface Producto {
  id: string;
  nombre: string; // nombre comercial, ej. "Panadol Forte"
  componenteActivo: string; // ej. "Paracetamol" (puede ir vacío)
  laboratorio: string; // ej. "Bayer"
  tipo: TipoMedicamento;
  presentacion: string; // ej. "Tabletas 500 mg", "Jarabe 120 ml"
  codigo: string; // código de barras o interno (opcional)
  stock: number; // total de unidades = suma de sus lotes
  stockMinimo: number; // al llegar a esta cantidad se muestra alerta
  precioCosto: number; // lo que se le paga al proveedor
  precioVenta: number; // precio al público
  activo: boolean; // false = eliminado (se conserva para el historial)
  vencimiento?: string; // solo en productos antiguos, creados antes de usar lotes
}

/** Datos que se capturan en el formulario de producto */
export type DatosProducto = Omit<Producto, 'id' | 'activo' | 'stock' | 'vencimiento'>;

/** Colección "proveedores": quién le vende la mercadería a la farmacia */
export interface Proveedor {
  id: string;
  nombre: string;
  telefono: string;
  contacto: string; // nombre del vendedor o visitador
  direccion: string;
  activo: boolean;
}

export type DatosProveedor = Omit<Proveedor, 'id' | 'activo'>;

/**
 * Colección "lotes": cada ingreso de mercadería de un producto.
 * Un mismo medicamento puede tener varios lotes con distinta fecha
 * de vencimiento; al vender se descuenta primero el que vence antes (FEFO).
 */
export interface Lote {
  id: string;
  productoId: string;
  productoNombre: string;
  numeroLote: string; // el que viene impreso en la caja
  vencimiento: string; // AAAA-MM-DD
  cantidadInicial: number; // unidades que ingresaron
  cantidad: number; // unidades que quedan
  costoUnitario: number;
  proveedorId: string;
  proveedorNombre: string;
  fechaIngreso: Date;
  esHeredado?: boolean; // lote calculado para productos antiguos (no existe en la base de datos)
}

/** Datos de una entrada de mercadería (formulario) */
export interface DatosEntrada {
  numeroLote: string;
  vencimiento: string;
  cantidad: number;
  costoUnitario: number;
  proveedorId: string;
  proveedorNombre: string;
}

/** Tipos de movimiento del kardex */
export type TipoMovimiento = 'entrada' | 'venta' | 'anulacion' | 'baja' | 'ajuste';

/**
 * Colección "movimientos" (KARDEX): cada entrada o salida de unidades.
 * Permite reconstruir la historia completa de cualquier producto o lote.
 */
export interface Movimiento {
  id: string;
  fecha: Date;
  tipo: TipoMovimiento;
  productoId: string;
  productoNombre: string;
  loteId: string;
  numeroLote: string;
  cantidad: number; // positiva = entra, negativa = sale
  detalle: string;
  referencia: string; // ej. el número de venta
  usuarioUid: string;
  usuarioNombre: string;
}

/** Unidades de un lote que salieron en una venta */
export interface SalidaLote {
  loteId: string;
  numeroLote: string;
  cantidad: number;
}

/** Una línea dentro de una venta */
export interface ItemVenta {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioVenta: number;
  precioCosto: number;
  subtotal: number;
  lotes: SalidaLote[]; // de qué lotes salió (trazabilidad)
}

/** Colección "ventas": una venta registrada (solo se puede anular, no editar) */
export interface Venta {
  id: string;
  numero: string; // número corto para el comprobante
  fecha: Date;
  items: ItemVenta[];
  total: number;
  ganancia: number;
  vendedorUid: string;
  vendedorNombre: string;
  anulada: boolean;
  motivoAnulacion?: string;
  anuladaPorNombre?: string;
  fechaAnulacion?: Date;
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
