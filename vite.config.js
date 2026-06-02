import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'favicon.png', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'JugarLaPelota',
        short_name: 'JLP',
        description: 'Tu plataforma de torneos deportivos',
        theme_color: '#0ea5e9',
        background_color: '#0B1220',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'es',
        categories: ['sports', 'games'],
        shortcuts: [
          { name: 'Torneos', short_name: 'Torneos', url: '/torneos', icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }] },
          { name: 'En Vivo',  short_name: 'Live',    url: '/torneos', icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }] }
        ],
        icons: [
          { src: '/icons/icon-72.png',   sizes: '72x72',   type: 'image/png', purpose: 'maskable any' },
          { src: '/icons/icon-96.png',   sizes: '96x96',   type: 'image/png', purpose: 'maskable any' },
          { src: '/icons/icon-128.png',  sizes: '128x128', type: 'image/png', purpose: 'maskable any' },
          { src: '/icons/icon-144.png',  sizes: '144x144', type: 'image/png', purpose: 'maskable any' },
          { src: '/icons/icon-152.png',  sizes: '152x152', type: 'image/png', purpose: 'maskable any' },
          { src: '/icons/icon-192.png',  sizes: '192x192', type: 'image/png', purpose: 'maskable any' },
          { src: '/icons/icon-384.png',  sizes: '384x384', type: 'image/png', purpose: 'maskable any' },
          { src: '/icons/icon-512.png',  sizes: '512x512', type: 'image/png', purpose: 'maskable any' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        importScripts: ['/sw-push.js'],
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', expiration: { maxEntries: 100, maxAgeSeconds: 60 } }
          },
          {
            urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'images-cache', expiration: { maxEntries: 200, maxAgeSeconds: 86400 * 30 } }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none'
    }
  }
})
