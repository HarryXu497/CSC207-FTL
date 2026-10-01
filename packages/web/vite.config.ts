import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    /* Lets the browser bundle import '@recall/shared'. Must match the `paths`
       entry in tsconfig.json: tsconfig teaches the TYPE CHECKER where the shared
       package is, this teaches the BUNDLER. */
    alias: {
      '@recall/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
    },
  },

  server: {
    port: 5173,
    /* THE IMPORTANT BIT.
       A page served from localhost:5173 is forbidden by the browser from calling
       localhost:4000 - a different port means a different ORIGIN, so the
       same-origin policy blocks it.

       Rather than fight that, the Vite dev server forwards anything starting with
       /api to Express. As far as the browser is concerned there is one origin and
       no CORS at all. It also means our fetch calls need no host, so the same code
       works in development and in production. */
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
});
