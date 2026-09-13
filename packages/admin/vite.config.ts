import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/admin/',
  plugins: [vue()],
  build: { outDir: '../worker/assets/admin', emptyOutDir: true },
  server: {
    proxy: {
      '/admin/api': 'http://localhost:8787',
      '/api': 'http://localhost:8787',
    },
  },
});
