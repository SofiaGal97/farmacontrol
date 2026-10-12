// ============================================================
// HOOK DE CONEXIÓN: ¿hay internet? ¿cuántos cambios faltan por subir?
// ============================================================
import { useEffect, useState } from 'react';
import { suscribirPendientes } from '../servicios/sincronizacion';

export function useConexion() {
  const [enLinea, setEnLinea] = useState(navigator.onLine);
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    const alConectar = () => setEnLinea(true);
    const alDesconectar = () => setEnLinea(false);
    window.addEventListener('online', alConectar);
    window.addEventListener('offline', alDesconectar);
    return () => {
      window.removeEventListener('online', alConectar);
      window.removeEventListener('offline', alDesconectar);
    };
  }, []);

  useEffect(() => suscribirPendientes(setPendientes), []);

  return { enLinea, pendientes };
}
