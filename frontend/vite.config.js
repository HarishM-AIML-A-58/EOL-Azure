import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    /* In dev the API lives on its own port; in production the FastAPI app
       serves this bundle from the same origin, so no proxy is involved. */
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  preview: {
    host: '0.0.0.0',
    port: 5173,
  },

  build: {
    /* FastAPI mounts this directory — see backend/app/app.py. */
    outDir: '../backend/static/dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-prime': ['primereact/dropdown', 'primereact/inputswitch', 'primereact/overlaypanel'],
        },
      },
    },
  },

  esbuild: {
    drop: ['console', 'debugger'],
  },
});
