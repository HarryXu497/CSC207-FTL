import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    // Alias the shared package under the path '@recall/shared'
    alias: {
      '@recall/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
    },
  },

  server: {
    port: 5173,
    // Proxies all requests from /api to localhost:4000
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
});
