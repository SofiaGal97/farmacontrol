// ============================================================
// CAPA DE LÓGICA: VALIDACIONES
// Revisa que los datos estén completos y correctos ANTES de
// guardarlos. (Las reglas de Firestore vuelven a validar en la nube.)
// ============================================================
import type { DatosProducto, TipoMedicamento } from '../modelos/tipos';

/** Lo que escribe el usuario en el formulario (todo llega como texto) */
export interface FormularioProducto {
  nombre: string;
  componenteActivo: string;
  laboratorio: string;
  tipo: TipoMedicamento | '';
  stock: string;
  stockMinimo: string;
  precioCosto: string;
  precioVenta: string;
  vencimiento: string;
}

export const FORMULARIO_PRODUCTO_VACIO: FormularioProducto = {
  nombre: '',
  componenteActivo: '',
  laboratorio: '',
  tipo: '',
  stock: '',
  stockMinimo: '5',
  precioCosto: '',
  precioVenta: '',
  vencimiento: '',
};

type Resultado = { valido: true; datos: DatosProducto } | { valido: false; error: string };

const esEnteroNoNegativo = (texto: string) => /^\d+$/.test(texto.trim());
const esMontoValido = (texto: string) => /^\d+(\.\d{1,2})?$/.test(texto.trim());

/** Valida el formulario y lo convierte a números y textos limpios */
export function validarProducto(formulario: FormularioProducto): Resultado {
  const nombre = formulario.nombre.trim();
  const laboratorio = formulario.laboratorio.trim();

  if (!nombre) return { valido: false, error: 'Escribe el nombre comercial.' };
  if (nombre.length > 120) return { valido: false, error: 'El nombre es demasiado largo.' };
  if (!laboratorio) return { valido: false, error: 'Escribe el laboratorio.' };
  if (!formulario.tipo) return { valido: false, error: 'Selecciona si es Ético o Genérico.' };

  if (!esEnteroNoNegativo(formulario.stock))
    return { valido: false, error: 'El stock debe ser un número entero (0 o más).' };
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

  if (!/^\d{4}-\d{2}-\d{2}$/.test(formulario.vencimiento))
    return { valido: false, error: 'Selecciona la fecha de vencimiento.' };

  return {
    valido: true,
    datos: {
      nombre,
      componenteActivo: formulario.componenteActivo.trim(),
      laboratorio,
      tipo: formulario.tipo,
      stock: parseInt(formulario.stock, 10),
      stockMinimo: parseInt(formulario.stockMinimo, 10),
      precioCosto,
      precioVenta,
      vencimiento: formulario.vencimiento,
    },
  };
}

/** Validación de un usuario nuevo */
export function validarNuevoUsuario(nombre: string, correo: string, contrasena: string): string | null {
  if (!nombre.trim()) return 'Escribe el nombre de la persona.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) return 'El correo no es válido.';
  if (contrasena.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
  return null;
}
