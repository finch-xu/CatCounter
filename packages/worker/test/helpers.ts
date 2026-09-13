import { env, exports } from 'cloudflare:workers';
import type { Env } from '../src/env';

export const testEnv = env as unknown as Env;

const BASE = 'https://cc.test';

/** 通过 worker 的 fetch 入口发请求 */
export function api(path: string, init?: RequestInit): Promise<Response> {
  return (exports as any).default.fetch(BASE + path, init) as Promise<Response>;
}

export function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

/** 登录并返回可直接放进 cookie 头的字符串 */
export async function login(password = 'test-password'): Promise<string> {
  const res = await api('/admin/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (res.status !== 200) throw new Error('login failed: ' + res.status);
  const setCookie = res.headers.get('set-cookie') ?? '';
  return setCookie.split(';')[0];
}

export function adminApi(path: string, cookie: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('cookie', cookie);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  return api('/admin/api' + path, { ...init, headers });
}
