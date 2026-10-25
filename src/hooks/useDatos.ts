// ============================================================
// HOOKS DE DATOS EN TIEMPO REAL
// Cada hook se "suscribe" a una colección y devuelve:
//   { datos, cargando, error }
// Cuando la pantalla se cierra, la suscripción se cancela sola.
// ============================================================
import { useEffect, useState } from 'react';
import type { Unsubscribe } from 'firebase/firestore';
import type { Lote, Movimiento, Producto, Proveedor, RegistroBitacora, Usuario, Venta } from '../modelos/tipos';
import { escucharProductos } from '../servicios/productos';
import { escucharVentas } from '../servicios/ventas';
import { escucharUsuarios } from '../servicios/usuarios';
import { escucharBitacora } from '../servicios/bitacora';
import { escucharLotes } from '../servicios/lotes';
import { escucharProveedores } from '../servicios/proveedores';
import { escucharMovimientosDePeriodo, escucharMovimientosDeProducto } from '../servicios/movimientos';
import { traducirError } from '../servicios/errores';

interface EstadoDatos<T> {
  datos: T[];
  cargando: boolean;
  error: string | null;
}

type Suscribir<T> = (alRecibir: (datos: T[]) => void, alFallar: (error: Error) => void) => Unsubscribe;

/** Lógica común de todos los hooks de este archivo */
function useSuscripcion<T>(suscribir: Suscribir<T>, clave: string): EstadoDatos<T> {
  const [estado, setEstado] = useState<EstadoDatos<T>>({ datos: [], cargando: true, error: null });

  useEffect(() => {
    setEstado((anterior) => ({ ...anterior, cargando: true }));
    return suscribir(
      (datos) => setEstado({ datos, cargando: false, error: null }),
      (error) => setEstado({ datos: [], cargando: false, error: traducirError(error) }),
    );
    // "clave" cambia cuando cambian los filtros (por ejemplo, las fechas)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  return estado;
}

export function useProductos() {
  return useSuscripcion<Producto>(escucharProductos, 'productos');
}

export function useVentas(desde: Date, hasta: Date) {
  return useSuscripcion<Venta>(
    (alRecibir, alFallar) => escucharVentas(desde, hasta, alRecibir, alFallar),
    `ventas-${desde.getTime()}-${hasta.getTime()}`,
  );
}

export function useUsuarios() {
  return useSuscripcion<Usuario>(escucharUsuarios, 'usuarios');
}

export function useBitacora(cantidad = 200) {
  return useSuscripcion<RegistroBitacora>(
    (alRecibir, alFallar) => escucharBitacora(cantidad, alRecibir, alFallar),
    `bitacora-${cantidad}`,
  );
}

export function useLotes() {
  return useSuscripcion<Lote>(escucharLotes, 'lotes');
}

export function useProveedores() {
  return useSuscripcion<Proveedor>(escucharProveedores, 'proveedores');
}

/** Kardex de un producto */
export function useMovimientosDeProducto(productoId: string) {
  return useSuscripcion<Movimiento>(
    (alRecibir, alFallar) => escucharMovimientosDeProducto(productoId, alRecibir, alFallar),
    `movimientos-${productoId}`,
  );
}

/** Movimientos de todos los productos en un rango de fechas */
export function useMovimientosDePeriodo(desde: Date, hasta: Date) {
  return useSuscripcion<Movimiento>(
    (alRecibir, alFallar) => escucharMovimientosDePeriodo(desde, hasta, alRecibir, alFallar),
    `movimientos-${desde.getTime()}-${hasta.getTime()}`,
  );
}
