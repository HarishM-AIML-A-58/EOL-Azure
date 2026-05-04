import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // Allow access from any IP on the network
    port: 5173,
    strictPort: false,  // Try next port if in use
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    outDir: '../backend/static/dist',
    emptyOutDir: true,
  }
})
