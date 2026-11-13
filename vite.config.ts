import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // DRV-001: PWA instalable (manifest + service worker generado con Workbox).
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'offline.html', 'icons/apple-touch-icon-180.png'],
      manifest: {
        name: 'UCO Kudos',
        short_name: 'Kudos',
        description: 'Reconocimientos para la comunidad de la UCO.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#083f75',
        background_color: '#ffffff',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precachea el "shell": JS, CSS, HTML, íconos y la página offline.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // Las navegaciones van a la red; si no hay red se muestra offline.html.
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkOnly',
            options: { precacheFallback: { fallbackURL: '/offline.html' } },
          },
        ],
      },
    }),
  ],
})
