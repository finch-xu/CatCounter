import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from './composables/useAuth';

export const router = createRouter({
  history: createWebHistory('/admin/'),
  routes: [
    { path: '/login', name: 'login', component: () => import('./views/LoginView.vue'), meta: { public: true } },
    { path: '/', name: 'overview', component: () => import('./views/OverviewView.vue') },
    { path: '/sites/:id', name: 'site', component: () => import('./views/SiteView.vue'), props: true },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

router.beforeEach(async (to) => {
  if (to.meta.public) return true;
  const { check } = useAuth();
  return (await check()) ? true : { name: 'login', query: { next: to.fullPath } };
});
