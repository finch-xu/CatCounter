import { createApp } from 'vue';
import App from './App.vue';
import { setUnauthorizedHandler } from './api';
import { useAuth } from './composables/useAuth';
import { i18n } from './i18n';
import { router } from './router';
import './styles/tokens.css';
import './styles/base.css';

setUnauthorizedHandler(() => {
  useAuth().setAuthed(false);
  if (router.currentRoute.value.name !== 'login') router.push({ name: 'login' });
});

createApp(App).use(i18n).use(router).mount('#app');
