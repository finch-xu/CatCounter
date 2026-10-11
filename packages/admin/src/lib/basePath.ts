/** 后台挂载的路径前缀，与 vite.config.ts 的 base、Worker 的回退路由一致 */
export const BASE = '/admin';

/** 去掉路径里的 /admin 前缀；数据路由的 state.location 和 loader 里的 request.url 都带着它 */
export function stripBase(pathname: string): string {
  if (pathname === BASE) return '/';
  return pathname.startsWith(`${BASE}/`) ? pathname.slice(BASE.length) : pathname;
}
