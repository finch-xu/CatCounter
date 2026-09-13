import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { normalizePath } from '@catcounter/shared';
import type { Env } from '../env';
import { timingSafeEqualStr } from '../lib/crypto';
import { normalizeOrigin } from '../lib/origin';
import { createSession, verifySession } from '../lib/session';
import {
  createSite, deleteSite, getSite, listPages, listSites, setPageCounters, setSiteCounters, updateSite,
} from '../repo/sites';
import { createToken, listTokens, revokeToken } from '../repo/tokens';

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

/** 返回规范化后的 origins；任一非法或为空返回 null */
function parseOrigins(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') return null;
    const o = normalizeOrigin(raw);
    if (!o) return null;
    if (!out.includes(o)) out.push(o);
  }
  return out;
}

function parseCounter(v: unknown): number | undefined | null {
  if (v === undefined) return undefined;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) return null;
  return v;
}

async function readJson(c: { req: { json: () => Promise<unknown> } }): Promise<Record<string, unknown> | null> {
  try {
    const v = await c.req.json();
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

adminRoutes.get('/sites', async (c) => c.json(await listSites(c.env.DB)));

adminRoutes.post('/sites', async (c) => {
  const body = await readJson(c);
  if (!body) return c.json({ error: 'bad json' }, 400);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const origins = parseOrigins(body.origins);
  if (!name) return c.json({ error: '站点名称不能为空' }, 400);
  if (!origins) return c.json({ error: '至少填写一个合法的 Origin，例如 https://blog.example.com' }, 400);
  const site = await createSite(c.env.DB, { name, origins }, now());
  const token = await createToken(c.env.DB, site.id, '默认', now());
  return c.json({ site, token }, 201);
});

adminRoutes.get('/sites/:id', async (c) => {
  const site = await getSite(c.env.DB, c.req.param('id'));
  return site ? c.json(site) : c.json({ error: 'not found' }, 404);
});

adminRoutes.patch('/sites/:id', async (c) => {
  const id = c.req.param('id');
  if (!(await getSite(c.env.DB, id))) return c.json({ error: 'not found' }, 404);
  const body = await readJson(c);
  if (!body) return c.json({ error: 'bad json' }, 400);
  const patch: { name?: string; origins?: string[]; retention_days?: number | null } = {};
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) return c.json({ error: '站点名称不能为空' }, 400);
    patch.name = body.name.trim();
  }
  if (body.origins !== undefined) {
    const origins = parseOrigins(body.origins);
    if (!origins) return c.json({ error: '至少填写一个合法的 Origin' }, 400);
    patch.origins = origins;
  }
  if (body.retention_days !== undefined) {
    const r = body.retention_days;
    if (r !== null && (typeof r !== 'number' || !Number.isInteger(r) || r < 1)) return c.json({ error: '保留天数必须是正整数或空' }, 400);
    patch.retention_days = r as number | null;
  }
  return c.json(await updateSite(c.env.DB, id, patch));
});

adminRoutes.delete('/sites/:id', async (c) => {
  const id = c.req.param('id');
  if (!(await getSite(c.env.DB, id))) return c.json({ error: 'not found' }, 404);
  await deleteSite(c.env.DB, id);
  return c.json({ ok: true });
});

adminRoutes.get('/sites/:id/pages', async (c) => {
  const id = c.req.param('id');
  if (!(await getSite(c.env.DB, id))) return c.json({ error: 'not found' }, 404);
  const q = c.req.query('q') ?? '';
  const limit = Math.min(Math.max(Number(c.req.query('limit') ?? 50) || 50, 1), 200);
  const offset = Math.max(Number(c.req.query('offset') ?? 0) || 0, 0);
  return c.json(await listPages(c.env.DB, id, q, limit, offset));
});

adminRoutes.put('/sites/:id/counters', async (c) => {
  const id = c.req.param('id');
  if (!(await getSite(c.env.DB, id))) return c.json({ error: 'not found' }, 404);
  const body = await readJson(c);
  if (!body) return c.json({ error: 'bad json' }, 400);
  const pv = parseCounter(body.pv);
  const uv = parseCounter(body.uv);
  if (pv === null || uv === null) return c.json({ error: '计数必须是非负整数' }, 400);
  await setSiteCounters(c.env.DB, id, { pv, uv });
  return c.json(await getSite(c.env.DB, id));
});

adminRoutes.put('/sites/:id/pages/counters', async (c) => {
  const id = c.req.param('id');
  if (!(await getSite(c.env.DB, id))) return c.json({ error: 'not found' }, 404);
  const body = await readJson(c);
  if (!body || typeof body.path !== 'string' || !body.path) return c.json({ error: 'path required' }, 400);
  const pv = parseCounter(body.pv);
  const uv = parseCounter(body.uv);
  if (pv === null || uv === null) return c.json({ error: '计数必须是非负整数' }, 400);
  await setPageCounters(c.env.DB, id, normalizePath(body.path), { pv, uv }, now());
  return c.json({ ok: true });
});

adminRoutes.get('/sites/:id/tokens', async (c) => {
  const id = c.req.param('id');
  if (!(await getSite(c.env.DB, id))) return c.json({ error: 'not found' }, 404);
  return c.json(await listTokens(c.env.DB, id));
});

adminRoutes.post('/sites/:id/tokens', async (c) => {
  const id = c.req.param('id');
  if (!(await getSite(c.env.DB, id))) return c.json({ error: 'not found' }, 404);
  const body = await readJson(c);
  const name = body && typeof body.name === 'string' && body.name.trim() ? body.name.trim() : '未命名';
  return c.json(await createToken(c.env.DB, id, name, now()), 201);
});

adminRoutes.delete('/sites/:id/tokens/:tid', async (c) => {
  const ok = await revokeToken(c.env.DB, c.req.param('id'), c.req.param('tid'), now());
  return ok ? c.json({ ok: true }) : c.json({ error: 'not found' }, 404);
});
