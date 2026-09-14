import { readFileSync } from 'node:fs';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const version = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version;

export default defineConfig({
  base: '/admin/',
  plugins: [vue()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    // vue-i18n 的构建开关：只用 Composition API，关掉 legacy API 以便 tree-shaking
    __VUE_I18N_FULL_INSTALL__: true,
    __VUE_I18N_LEGACY_API__: false,
    __INTLIFY_PROD_DEVTOOLS__: false,
  },
  build: { outDir: '../worker/assets/admin', emptyOutDir: true },
  server: {
    proxy: {
      '/admin/api': 'http://localhost:8787',
      '/api': 'http://localhost:8787',
    },
  },
});
