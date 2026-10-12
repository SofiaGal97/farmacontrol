// ============================================================
// CAPA DE LÓGICA: NOMBRE DE USUARIO
// Firebase necesita un correo para iniciar sesión. Para que la
// farmacia NO dependa de correos reales, convertimos el usuario
// (ej. "mercy") a un correo interno del propio proyecto
// ("mercy@farmacontrol-2cd80.firebaseapp.com"). Ese correo no se
// usa para enviar nada; solo identifica a la persona.
// Si alguien escribe un correo real (con @), se usa tal cual.
// ============================================================

export const DOMINIO_INTERNO = 'farmacontrol-2cd80.firebaseapp.com';

/** "Mercy" → "mercy@farmacontrol-2cd80.firebaseapp.com" */
export function usuarioACorreo(identificador: string): string {
  const limpio = identificador.trim().toLowerCase();
  return limpio.includes('@') ? limpio : `${limpio}@${DOMINIO_INTERNO}`;
}

/** "mercy@farmacontrol-2cd80.firebaseapp.com" → "mercy" (para mostrarlo en pantalla) */
export function correoAUsuario(correo: string): string {
  const sufijo = `@${DOMINIO_INTERNO}`;
  return correo.endsWith(sufijo) ? correo.slice(0, -sufijo.length) : correo;
}

/** ¿Es un correo real (se puede recuperar la contraseña por email)? */
export function esCorreoReal(correo: string): boolean {
  return !correo.endsWith(`@${DOMINIO_INTERNO}`);
}
