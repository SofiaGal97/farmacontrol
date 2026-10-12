// ============================================================
// SERVICIO DE SINCRONIZACIÓN (clave del modo SIN INTERNET)
//
// Firestore guarda primero cada cambio en el celular y lo sube a
// la nube cuando hay internet. Por eso NO esperamos (await) a que
// termine: si no hay señal, la promesa queda pendiente hasta que
// vuelva la conexión, y la pantalla se quedaría "congelada".
//
// Aquí contamos cuántos cambios faltan por subir para mostrarlo
// en el encabezado ("⏳ 3 cambios por subir").
// ============================================================
import type { WriteBatch } from 'firebase/firestore';
import { mostrarAviso } from './avisos';
import { traducirError } from './errores';

type Oyente = (pendientes: number) => void;

let pendientes = 0;
const oyentes = new Set<Oyente>();

function notificar() {
  oyentes.forEach((oyente) => oyente(pendientes));
}

export function suscribirPendientes(oyente: Oyente): () => void {
  oyentes.add(oyente);
  oyente(pendientes);
  return () => {
    oyentes.delete(oyente);
  };
}

/**
 * Guarda un lote de cambios (batch) "en segundo plano".
 * Un batch es atómico: o se guardan TODOS sus cambios, o ninguno.
 */
export function guardarEnSegundoPlano(lote: WriteBatch, descripcion: string): void {
  pendientes++;
  notificar();

  lote
    .commit()
    .catch((error) => {
      console.error(`Error al sincronizar "${descripcion}":`, error);
      mostrarAviso(`No se pudo guardar "${descripcion}": ${traducirError(error)}`, 'error');
    })
    .finally(() => {
      pendientes--;
      notificar();
    });
}
