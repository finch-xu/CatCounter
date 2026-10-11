import { createBrowserRouter, redirect, type LoaderFunctionArgs } from 'react-router';
import { api, setUnauthorizedHandler } from './api';
import { RouteError, RouteFallback } from './components/RouteError';
import { BASE, stripBase } from './lib/basePath';
import { qk, queryClient } from './queries';

/** 受保护路由的守卫：未登录时带着原路径跳到登录页 */
async function requireAuth({ request }: LoaderFunctionArgs) {
  try {
    await queryClient.fetchQuery({ queryKey: qk.me, queryFn: api.me, staleTime: Infinity, retry: false });
    return null;
  } catch {
    const url = new URL(request.url);
    const next = stripBase(url.pathname) + url.search;
    throw redirect(`/login?next=${encodeURIComponent(next)}`);
  }
}

export const router = createBrowserRouter(
  [
    {
      ErrorBoundary: RouteError,
      HydrateFallback: RouteFallback,
      children: [
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
    },
  ],
  { basename: BASE },
);

// 会话过期：忘掉“已登录”这个结论，回到登录页。
// 这里不清空整个缓存——页面此刻还挂载着，清空会让它们立刻再发一轮注定 401 的请求；
// 其余缓存由登录页挂载时统一清掉。
setUnauthorizedHandler(() => {
  queryClient.removeQueries({ queryKey: qk.me });
  if (stripBase(router.state.location.pathname) !== '/login') void router.navigate('/login');
});
