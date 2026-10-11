/** 登录后的跳转目标：只接受站内路径，且不回到登录页 */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return '/';
  if (next === '/login' || next.startsWith('/login?')) return '/';
  return next;
}
