// ============================================================
// Traduce los errores técnicos de Firebase a mensajes en español
// ============================================================

const MENSAJES: Record<string, string> = {
  'auth/invalid-credential': 'Usuario o contraseña incorrectos.',
  'auth/wrong-password': 'Usuario o contraseña incorrectos.',
  'auth/user-not-found': 'Usuario o contraseña incorrectos.',
  'auth/invalid-email': 'El usuario o correo no es válido.',
  'auth/email-already-in-use': 'Ese nombre de usuario ya existe. Elige otro.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
  'auth/network-request-failed': 'Se necesita conexión a internet para esta acción.',
  'auth/user-disabled': 'Este usuario está deshabilitado.',
  'permission-denied': 'No tienes permiso para realizar esta acción.',
  'unavailable': 'Sin conexión con el servidor. Intenta cuando tengas internet.',
};

export function traducirError(error: unknown): string {
  const codigo = (error as { code?: string })?.code ?? '';
  // Los códigos de Firestore pueden venir como "firestore/permission-denied"
  const codigoCorto = codigo.replace('firestore/', '');
  return MENSAJES[codigo] ?? MENSAJES[codigoCorto] ?? 'Ocurrió un error inesperado. Intenta de nuevo.';
}
