import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      '@recall/server': fileURLToPath(new URL('../server/src', import.meta.url)),
    },
  },

  server: {
    port: 5173,
    // Proxies all requests from /api to localhost:4000
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
});
