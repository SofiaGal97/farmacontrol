// ============================================================
// CAPA DE CONFIGURACIÓN
// Conexión con Firebase (la "nube" del sistema).
// ============================================================
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

// Datos del proyecto "farmacontrol" en la consola de Firebase.
// No son contraseñas: identifican el proyecto. La seguridad real
// la dan el inicio de sesión y las reglas del archivo firestore.rules.
export const firebaseConfig = {
  apiKey: 'AIzaSyDZzNAx2hEhzenpe3htPzUp-5ODiUm2Qys',
  authDomain: 'farmacontrol-2cd80.firebaseapp.com',
  projectId: 'farmacontrol-2cd80',
  storageBucket: 'farmacontrol-2cd80.firebasestorage.app',
  messagingSenderId: '199214124987',
  appId: '1:199214124987:web:6ddbcf342e124cd134be9e',
};

export const app = initializeApp(firebaseConfig);

// Autenticación (usuarios y contraseñas). La sesión queda guardada
// en el celular, así que se puede seguir usando sin internet.
export const auth = getAuth(app);

// Base de datos Firestore CON CACHÉ LOCAL PERSISTENTE:
// - Sin internet: lee y guarda en la memoria del celular (IndexedDB).
// - Con internet: sube los cambios pendientes y descarga los de otros dispositivos.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(), // permite varias pestañas abiertas
  }),
});
