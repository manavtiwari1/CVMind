import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { seoPrerender } from './seo/prerender'

// macOS AirPlay Receiver holds port 5000, so local dev can point the proxy elsewhere via BACKEND_PORT
const backendTarget = `http://localhost:${process.env.BACKEND_PORT || 5000}`

// https://vite.dev/config/
export default defineConfig({
  // seoPrerender writes one HTML file per page plus 404.html and sitemap.xml after the build
  plugins: [react(), tailwindcss(), seoPrerender()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // www.lvh.me / app.lvh.me resolve to localhost for testing the site/app host split
    allowedHosts: ['.lvh.me'],
    proxy: {
      '/_/backend': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1600,
  },
})
