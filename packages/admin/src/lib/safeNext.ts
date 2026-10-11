/** 登录后的跳转目标：只接受站内路径，且不回到登录页 */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return '/';
  // 只看路径部分，/login/、/login?x、/login#x 都算登录页
  const path = next.split(/[?#]/)[0]!.replace(/\/+$/, '');
  return path === '/login' ? '/' : next;
}
