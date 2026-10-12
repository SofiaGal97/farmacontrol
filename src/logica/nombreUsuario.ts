// ============================================================
// CAPA DE LÓGICA: NOMBRE DE USUARIO
// Firebase necesita un correo para iniciar sesión. Para que la
// farmacia NO dependa de correos reales, convertimos el usuario
// (ej. "ventas1") a un correo interno del propio proyecto
// ("ventas1@farmacontrol-2cd80.firebaseapp.com"). Ese correo no se
// usa para enviar nada; solo identifica a la persona.
// Si alguien escribe un correo real (con @), se usa tal cual.
// ============================================================

export const DOMINIO_INTERNO = 'farmacontrol-2cd80.firebaseapp.com';

/** "Ventas1" → "ventas1@farmacontrol-2cd80.firebaseapp.com" */
export function usuarioACorreo(identificador: string): string {
  const limpio = identificador.trim().toLowerCase();
  return limpio.includes('@') ? limpio : `${limpio}@${DOMINIO_INTERNO}`;
}

/** "ventas1@farmacontrol-2cd80.firebaseapp.com" → "ventas1" (para mostrarlo en pantalla) */
export function correoAUsuario(correo: string): string {
  const sufijo = `@${DOMINIO_INTERNO}`;
  return correo.endsWith(sufijo) ? correo.slice(0, -sufijo.length) : correo;
}
