// ============================================================
// SERVICIO DE AVISOS (mensajes flotantes de éxito o error)
// Cualquier parte del sistema puede llamar a mostrarAviso(...)
// y el componente <Avisos/> lo dibuja en pantalla.
// ============================================================

export type TipoAviso = 'exito' | 'error' | 'info';

export interface Aviso {
  id: number;
  mensaje: string;
  tipo: TipoAviso;
}

type Oyente = (avisos: Aviso[]) => void;

let avisos: Aviso[] = [];
let siguienteId = 1;
const oyentes = new Set<Oyente>();

function notificar() {
  oyentes.forEach((oyente) => oyente(avisos));
}

export function mostrarAviso(mensaje: string, tipo: TipoAviso = 'exito') {
  const aviso: Aviso = { id: siguienteId++, mensaje, tipo };
  avisos = [...avisos, aviso];
  notificar();
  // Desaparece solo (los errores duran más para poder leerlos)
  setTimeout(() => cerrarAviso(aviso.id), tipo === 'error' ? 7000 : 3500);
}

export function cerrarAviso(id: number) {
  avisos = avisos.filter((a) => a.id !== id);
  notificar();
}

export function suscribirAvisos(oyente: Oyente): () => void {
  oyentes.add(oyente);
  oyente(avisos);
  return () => {
    oyentes.delete(oyente);
  };
}
