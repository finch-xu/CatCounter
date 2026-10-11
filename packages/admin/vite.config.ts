import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const version = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version;

export default defineConfig({
  base: '/admin/',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: { outDir: '../worker/assets/admin', emptyOutDir: true },
  server: {
    proxy: {
      '/admin/api': 'http://localhost:8787',
      '/api': 'http://localhost:8787',
    },
  },
});
