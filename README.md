# FarmaControl

Sistema de inventario y ventas para la **Farmacia "Regalo de Dios"** (Retalhuleu).
Aplicación web progresiva (PWA): se abre con un link, se instala como app y **funciona con y sin internet**.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Interfaz (frontend) | React 19 + TypeScript + Vite + Tailwind CSS |
| Modo sin internet | PWA (service worker con vite-plugin-pwa) + caché persistente de Firestore |
| Base de datos en la nube | Firebase Cloud Firestore |
| Usuarios y roles | Firebase Authentication + reglas de seguridad (`firestore.rules`) |
| Reportes | jsPDF + jspdf-autotable (PDF) y ExcelJS (Excel) |
| Publicación | Firebase Hosting con GitHub Actions (https://farmacontrol-2cd80.web.app) |

## Estructura por capas (`src/`)

```
config/       Conexión con Firebase
modelos/      Forma de los datos (Producto, Venta, Usuario…)
logica/       Reglas de negocio puras: alertas, validaciones, cálculos de reportes
servicios/    Lectura y escritura en la base de datos, PDFs, avisos
hooks/        Puente entre servicios y pantallas (sesión, datos en tiempo real, conexión)
componentes/  Piezas visuales reutilizables (modal, menú, encabezado…)
paginas/      Pantallas completas (login, inventario, venta, reportes, proveedores, usuarios, bitácora)
```

Regla: las **páginas** usan **hooks** y **servicios**; solo los **servicios** hablan con Firebase.

## Comandos

```bash
npm install      # instalar librerías (una vez)
npm run dev      # abrir en modo desarrollo
npm run build    # compilar para publicar
```
