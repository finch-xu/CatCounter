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
