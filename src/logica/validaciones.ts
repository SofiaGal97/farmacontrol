// ============================================================
// CAPA DE LÓGICA: VALIDACIONES
// Revisa que los datos estén completos y correctos ANTES de
// guardarlos. (Las reglas de Firestore vuelven a validar en la nube.)
// ============================================================
import type { DatosProducto, DatosProveedor, TipoMedicamento } from '../modelos/tipos';

const esEnteroNoNegativo = (texto: string) => /^\d+$/.test(texto.trim());
const esEnteroPositivo = (texto: string) => /^\d+$/.test(texto.trim()) && Number(texto) > 0;
const esMontoValido = (texto: string) => /^\d+(\.\d{1,2})?$/.test(texto.trim());
const esFecha = (texto: string) => /^\d{4}-\d{2}-\d{2}$/.test(texto);

// ------------------------------------------------------------
// Producto
// ------------------------------------------------------------

/** Lo que escribe el usuario en el formulario de producto (todo llega como texto) */
export interface FormularioProducto {
  nombre: string;
  componenteActivo: string;
  laboratorio: string;
  tipo: TipoMedicamento | '';
  presentacion: string;
  codigo: string;
  stockMinimo: string;
  precioCosto: string;
  precioVenta: string;
}

export const FORMULARIO_PRODUCTO_VACIO: FormularioProducto = {
  nombre: '',
  componenteActivo: '',
  laboratorio: '',
  tipo: '',
  presentacion: '',
  codigo: '',
  stockMinimo: '5',
  precioCosto: '',
  precioVenta: '',
};

type Resultado<T> = { valido: true; datos: T } | { valido: false; error: string };

/** Valida el formulario de producto y lo convierte a números y textos limpios */
export function validarProducto(formulario: FormularioProducto): Resultado<DatosProducto> {
  const nombre = formulario.nombre.trim();
  const laboratorio = formulario.laboratorio.trim();

  if (!nombre) return { valido: false, error: 'Escribe el nombre comercial.' };
  if (nombre.length > 120) return { valido: false, error: 'El nombre es demasiado largo.' };
  if (!laboratorio) return { valido: false, error: 'Escribe el laboratorio.' };
  if (!formulario.tipo) return { valido: false, error: 'Selecciona si es Ético o Genérico.' };

  if (!esEnteroNoNegativo(formulario.stockMinimo))
    return { valido: false, error: 'El stock mínimo debe ser un número entero (0 o más).' };

  if (!esMontoValido(formulario.precioCosto))
    return { valido: false, error: 'El precio de costo no es válido (ej. 12.50).' };
  if (!esMontoValido(formulario.precioVenta))
    return { valido: false, error: 'El precio de venta no es válido (ej. 15.00).' };

  const precioCosto = Number(formulario.precioCosto);
  const precioVenta = Number(formulario.precioVenta);
  if (precioVenta < precioCosto)
    return { valido: false, error: 'El precio de venta no puede ser menor que el precio de costo.' };

  return {
    valido: true,
    datos: {
      nombre,
      componenteActivo: formulario.componenteActivo.trim(),
      laboratorio,
      tipo: formulario.tipo,
      presentacion: formulario.presentacion.trim(),
      codigo: formulario.codigo.trim(),
      stockMinimo: parseInt(formulario.stockMinimo, 10),
      precioCosto,
      precioVenta,
    },
  };
}

// ------------------------------------------------------------
// Entrada de mercadería (lote)
// ------------------------------------------------------------

export interface FormularioEntrada {
  numeroLote: string;
  vencimiento: string;
  cantidad: string;
  costoUnitario: string;
  proveedorId: string;
}

export const FORMULARIO_ENTRADA_VACIO: FormularioEntrada = {
  numeroLote: '',
  vencimiento: '',
  cantidad: '',
  costoUnitario: '',
  proveedorId: '',
};

export interface EntradaValidada {
  numeroLote: string;
  vencimiento: string;
  cantidad: number;
  costoUnitario: number;
  proveedorId: string;
}

/** Valida los datos de un lote que ingresa */
export function validarEntrada(formulario: FormularioEntrada): Resultado<EntradaValidada> {
  const numeroLote = formulario.numeroLote.trim();
  if (!esEnteroPositivo(formulario.cantidad))
    return { valido: false, error: 'La cantidad debe ser un número entero mayor a 0.' };
  if (!numeroLote) return { valido: false, error: 'Escribe el número de lote (viene impreso en la caja).' };
  if (numeroLote.length > 40) return { valido: false, error: 'El número de lote es demasiado largo.' };
  if (!esFecha(formulario.vencimiento)) return { valido: false, error: 'Selecciona la fecha de vencimiento del lote.' };
  if (formulario.costoUnitario.trim() !== '' && !esMontoValido(formulario.costoUnitario))
    return { valido: false, error: 'El costo unitario no es válido (ej. 12.50).' };

  return {
    valido: true,
    datos: {
      numeroLote,
      vencimiento: formulario.vencimiento,
      cantidad: parseInt(formulario.cantidad, 10),
      costoUnitario: Number(formulario.costoUnitario || 0),
      proveedorId: formulario.proveedorId,
    },
  };
}

// ------------------------------------------------------------
// Proveedor
// ------------------------------------------------------------

export function validarProveedor(datos: DatosProveedor): Resultado<DatosProveedor> {
  const limpio: DatosProveedor = {
    nombre: datos.nombre.trim(),
    telefono: datos.telefono.trim(),
    contacto: datos.contacto.trim(),
    direccion: datos.direccion.trim(),
  };
  if (!limpio.nombre) return { valido: false, error: 'Escribe el nombre del proveedor.' };
  if (limpio.nombre.length > 100) return { valido: false, error: 'El nombre es demasiado largo.' };
  if (limpio.telefono && !/^[\d\s+-]{8,20}$/.test(limpio.telefono))
    return { valido: false, error: 'El teléfono solo puede llevar números, espacios, + o guiones (mínimo 8).' };
  return { valido: true, datos: limpio };
}

// ------------------------------------------------------------
// Usuario
// ------------------------------------------------------------

/** Validación de un usuario nuevo */
export function validarNuevoUsuario(nombre: string, usuario: string, contrasena: string): string | null {
  const limpio = usuario.trim().toLowerCase();
  if (!nombre.trim()) return 'Escribe el nombre de la persona.';
  if (limpio.includes('@')) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) return 'El correo no es válido.';
  } else if (!/^[a-z0-9._-]{3,30}$/.test(limpio)) {
    return 'El usuario debe tener de 3 a 30 letras o números, sin espacios ni tildes.';
  }
  if (contrasena.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
  return null;
}
