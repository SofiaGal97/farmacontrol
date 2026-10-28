import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Configuración de Vite (la herramienta que compila y sirve la página).
export default defineConfig({
  // Carpeta donde vive la página publicada (en Firebase Hosting es la raíz "/").
  base: process.env.VITE_BASE ?? '/',

  plugins: [
    react(),
    tailwindcss(),

    // PWA (Progressive Web App): permite instalar la página como app
    // y abrirla SIN internet. El "service worker" guarda en el celular
    // todos los archivos de la página la primera vez que se abre.
    VitePWA({
      registerType: 'autoUpdate', // si hay versión nueva, se actualiza sola
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'FarmaControl - Farmacia Regalo de Dios',
        short_name: 'FarmaControl',
        description: 'Inventario, ventas y alertas de la Farmacia Regalo de Dios',
        lang: 'es',
        theme_color: '#2563eb',
        background_color: '#f1f5f9',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icono-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
})
