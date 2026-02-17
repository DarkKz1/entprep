import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
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
      registerType: 'prompt',
      manifest: {
        name: 'ENTprep — Подготовка к ЕНТ',
        short_name: 'ENTprep',
        description: 'Подготовка к ЕНТ: 1950 вопросов, 13 предметов, полная симуляция',
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
          { src: '/icon-180.png', sizes: '180x180', type: 'image/png' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
      },
    }),
  ],
})
