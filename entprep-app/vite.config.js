import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    css: false,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      manifest: {
        name: 'ENTprep — Подготовка к ЕНТ',
        short_name: 'ENTprep',
        description: 'Бесплатная подготовка к ЕНТ: 10 000+ вопросов, 13 предметов, адаптивное обучение',
        theme_color: '#0f0f1a',
        background_color: '#0f0f1a',
        lang: 'ru',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        shortcuts: [
          { name: 'Полный ЕНТ', url: '/?screen=fullent', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
          { name: 'Прогресс', url: '/?screen=prog', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
          { name: 'Калькулятор', url: '/?screen=calc', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
        ],
        icons: [
          { src: '/icon-96.png', sizes: '96x96', type: 'image/png' },
          { src: '/icon-180.png', sizes: '180x180', type: 'image/png' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-256.png', sizes: '256x256', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,webmanifest}'],
        globIgnores: ['**/assets/biology-*.js', '**/assets/chemistry-*.js', '**/assets/english-*.js', '**/assets/geography-*.js', '**/assets/history_kz-*.js', '**/assets/informatics-*.js', '**/assets/law-*.js', '**/assets/literature-*.js', '**/assets/math_literacy-*.js', '**/assets/math_profile-*.js', '**/assets/physics-*.js', '**/assets/reading_passages-*.js', '**/assets/world_history-*.js'],
        maximumFileSizeToCacheInBytes: 400 * 1024,
      },
    }),
  ],
})
