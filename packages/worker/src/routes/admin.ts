import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Env } from '../env';
import { timingSafeEqualStr } from '../lib/crypto';
import { createSession, verifySession } from '../lib/session';

export const adminRoutes = new Hono<{ Bindings: Env }>();

const COOKIE = 'cc_session';
const now = () => Math.floor(Date.now() / 1000);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

adminRoutes.use('*', async (c, next) => {
  if (c.req.path === '/admin/api/login') return next();
  const ok = await verifySession(c.env.SESSION_SECRET, getCookie(c, COOKIE), now());
  if (!ok) return c.json({ error: 'unauthorized' }, 401);
  await next();
});

adminRoutes.post('/login', async (c) => {
  let body: { password?: unknown } = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'bad json' }, 400);
  }
  const password = typeof body.password === 'string' ? body.password : '';
  if (!password || !(await timingSafeEqualStr(password, c.env.ADMIN_PASSWORD))) {
    await sleep(500);
    return c.json({ error: '密码错误' }, 401);
  }
  const value = await createSession(c.env.SESSION_SECRET, now());
  setCookie(c, COOKIE, value, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/admin',
    maxAge: 7 * 86400,
  });
  return c.json({ ok: true });
});

adminRoutes.post('/logout', (c) => {
  deleteCookie(c, COOKIE, { path: '/admin' });
  return c.json({ ok: true });
});

adminRoutes.get('/me', (c) => c.json({ ok: true }));

// 临时占位，Task 8 会替换为真正的站点列表
adminRoutes.get('/sites', (c) => c.json([]));
