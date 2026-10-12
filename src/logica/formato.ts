// ============================================================
// CAPA DE LÓGICA: FORMATO DE TEXTOS, DINERO Y FECHAS
// ============================================================

/** 1234.5 → "Q 1,234.50" */
export function formatoQuetzales(monto: number): string {
  return (
    'Q ' +
    monto.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

const dosDigitos = (n: number) => String(n).padStart(2, '0');

/** Date → "12/10/2026 14:05" */
export function formatoFechaHora(fecha: Date): string {
  return (
    `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)}/${fecha.getFullYear()} ` +
    `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`
  );
}

/** Date → "12/10/2026" */
export function formatoFecha(fecha: Date): string {
  return `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
}

/** "2026-10-12" → "12/10/2026" */
export function formatoFechaTexto(fechaTexto: string): string {
  const [anio, mes, dia] = fechaTexto.split('-');
  return `${dia}/${mes}/${anio}`;
}

/** Date → "2026-10-12" (formato que usan los campos de fecha) */
export function fechaATexto(fecha: Date): string {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

/** Quita tildes y mayúsculas para buscar: "Ácido" → "acido" */
export function normalizarTexto(texto: string): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
