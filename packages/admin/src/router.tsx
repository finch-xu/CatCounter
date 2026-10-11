import { createBrowserRouter, redirect, type LoaderFunctionArgs } from 'react-router';
import { api, setUnauthorizedHandler } from './api';
import { qk, queryClient } from './queries';

/** 受保护路由的守卫：未登录时带着原路径跳到登录页 */
async function requireAuth({ request }: LoaderFunctionArgs) {
  try {
    await queryClient.fetchQuery({ queryKey: qk.me, queryFn: api.me, staleTime: Infinity, retry: false });
    return null;
  } catch {
    const url = new URL(request.url);
    const next = url.pathname.replace(/^\/admin/, '') + url.search;
    throw redirect(`/login?next=${encodeURIComponent(next || '/')}`);
  }
}

export const router = createBrowserRouter(
  [
    { path: '/login', lazy: async () => ({ Component: (await import('./pages/LoginPage')).default }) },
    {
      loader: requireAuth,
      lazy: async () => ({ Component: (await import('./components/layout/AppShell')).default }),
      children: [
        { index: true, lazy: async () => ({ Component: (await import('./pages/OverviewPage')).default }) },
        { path: 'details', lazy: async () => ({ Component: (await import('./pages/DetailsPage')).default }) },
        { path: 'sites/:id', lazy: async () => ({ Component: (await import('./pages/SitePage')).default }) },
      ],
    },
    { path: '*', loader: () => redirect('/') },
  ],
  { basename: '/admin' },
);

// 会话过期：清掉缓存里的旧数据，回到登录页
setUnauthorizedHandler(() => {
  queryClient.clear();
  if (router.state.location.pathname !== '/login') void router.navigate('/login');
});
