import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { normalizePath, type ApiErrorBody, type PageStatsSort } from '@catcounter/shared';
import type { Env } from '../env';
import { timingSafeEqualStr } from '../lib/crypto';
import { apiError } from '../lib/errors';
import { dayOf } from '../lib/hash';
import { normalizeOrigin } from '../lib/origin';
import { createSession, verifySession } from '../lib/session';
import {
  createSite, deleteSite, getSite, listPages, listSites, setPageCounters, setSiteCounters, updateSite,
} from '../repo/sites';
import { addDays, getOverview, getSiteStats, listPageStats, PAGE_STATS_SORTS } from '../repo/stats';
import { createToken, listTokens, revokeToken } from '../repo/tokens';

export const adminRoutes = new Hono<{ Bindings: Env }>();

const COOKIE = 'cc_session';
const now = () => Math.floor(Date.now() / 1000);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

adminRoutes.use('*', async (c, next) => {
  if (c.req.path === '/admin/api/login') return next();
  const ok = await verifySession(c.env.SESSION_SECRET, getCookie(c, COOKIE), now());
  if (!ok) return c.json(apiError('unauthorized'), 401);
  await next();
});

adminRoutes.post('/login', async (c) => {
  let body: { password?: unknown } = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json(apiError('bad_json'), 400);
  }
  const password = typeof body.password === 'string' ? body.password : '';
  if (!password || !(await timingSafeEqualStr(password, c.env.ADMIN_PASSWORD))) {
    await sleep(500);
    return c.json(apiError('wrong_password'), 401);
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
  if (!body) return c.json(apiError('bad_json'), 400);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const origins = parseOrigins(body.origins);
  if (!name) return c.json(apiError('site_name_required'), 400);
  if (!origins) return c.json(apiError('invalid_origins'), 400);
  const site = await createSite(c.env.DB, { name, origins }, now());
  const token = await createToken(c.env.DB, site.id, 'default', now());
  return c.json({ site, token }, 201);
});

adminRoutes.get('/sites/:id', async (c) => {
  const site = await getSite(c.env.DB, c.req.param('id'));
  return site ? c.json(site) : c.json(apiError('not_found'), 404);
});

adminRoutes.patch('/sites/:id', async (c) => {
  const id = c.req.param('id');
  if (!(await getSite(c.env.DB, id))) return c.json(apiError('not_found'), 404);
  const body = await readJson(c);
  if (!body) return c.json(apiError('bad_json'), 400);
  const patch: { name?: string; origins?: string[]; retention_days?: number | null } = {};
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) return c.json(apiError('site_name_required'), 400);
    patch.name = body.name.trim();
  }
  if (body.origins !== undefined) {
    const origins = parseOrigins(body.origins);
    if (!origins) return c.json(apiError('invalid_origins'), 400);
    patch.origins = origins;
  }
  if (body.retention_days !== undefined) {
    const r = body.retention_days;
    if (r !== null && (typeof r !== 'number' || !Number.isInteger(r) || r < 1)) return c.json(apiError('invalid_retention'), 400);
    patch.retention_days = r as number | null;
  }
  return c.json(await updateSite(c.env.DB, id, patch));
});

adminRoutes.delete('/sites/:id', async (c) => {
  const id = c.req.param('id');
  if (!(await getSite(c.env.DB, id))) return c.json(apiError('not_found'), 404);
  await deleteSite(c.env.DB, id);
  return c.json({ ok: true });
});

adminRoutes.get('/sites/:id/pages', async (c) => {
  const id = c.req.param('id');
  if (!(await getSite(c.env.DB, id))) return c.json(apiError('not_found'), 404);
  const q = c.req.query('q') ?? '';
  const limit = Math.min(Math.max(Number(c.req.query('limit') ?? 50) || 50, 1), 200);
  const offset = Math.max(Number(c.req.query('offset') ?? 0) || 0, 0);
  return c.json(await listPages(c.env.DB, id, q, limit, offset));
});

adminRoutes.put('/sites/:id/counters', async (c) => {
  const id = c.req.param('id');
  if (!(await getSite(c.env.DB, id))) return c.json(apiError('not_found'), 404);
  const body = await readJson(c);
  if (!body) return c.json(apiError('bad_json'), 400);
  const pv = parseCounter(body.pv);
  const uv = parseCounter(body.uv);
  if (pv === null || uv === null) return c.json(apiError('invalid_counter'), 400);
  await setSiteCounters(c.env.DB, id, { pv, uv });
  return c.json(await getSite(c.env.DB, id));
});

adminRoutes.put('/sites/:id/pages/counters', async (c) => {
  const id = c.req.param('id');
  if (!(await getSite(c.env.DB, id))) return c.json(apiError('not_found'), 404);
  const body = await readJson(c);
  if (!body || typeof body.path !== 'string' || !body.path) return c.json(apiError('path_required'), 400);
  const pv = parseCounter(body.pv);
  const uv = parseCounter(body.uv);
  if (pv === null || uv === null) return c.json(apiError('invalid_counter'), 400);
  await setPageCounters(c.env.DB, id, normalizePath(body.path), { pv, uv }, now());
  return c.json({ ok: true });
});

adminRoutes.get('/sites/:id/tokens', async (c) => {
  const id = c.req.param('id');
  if (!(await getSite(c.env.DB, id))) return c.json(apiError('not_found'), 404);
  return c.json(await listTokens(c.env.DB, id));
});

adminRoutes.post('/sites/:id/tokens', async (c) => {
  const id = c.req.param('id');
  if (!(await getSite(c.env.DB, id))) return c.json(apiError('not_found'), 404);
  const body = await readJson(c);
  const name = body && typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Untitled';
  return c.json(await createToken(c.env.DB, id, name, now()), 201);
});

adminRoutes.delete('/sites/:id/tokens/:tid', async (c) => {
  const ok = await revokeToken(c.env.DB, c.req.param('id'), c.req.param('tid'), now());
  return ok ? c.json({ ok: true }) : c.json(apiError('not_found'), 404);
});

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
/** 校验格式，并拒绝格式合法但日历上不存在的日期（例如 2026-02-30 会被 Date 静默滚到 3 月） */
function isDay(s: string): boolean {
  if (!DAY_RE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
const MAX_RANGE_DAYS = 366;

/** 读取 from/to 查询参数，默认最近 30 天；不合法时返回错误体 */
function parseRange(query: (key: string) => string | undefined): { from: string; to: string } | { error: ApiErrorBody } {
  const to = query('to') ?? dayOf(now());
  const from = query('from') ?? addDays(to, -29);
  if (!isDay(from) || !isDay(to)) return { error: apiError('invalid_date') };
  if (from > to) return { error: apiError('date_range_inverted') };
  if (addDays(from, MAX_RANGE_DAYS - 1) < to) return { error: apiError('date_range_too_long', { max: MAX_RANGE_DAYS }) };
  return { from, to };
}

adminRoutes.get('/overview', async (c) => {
  const today = dayOf(now());
  return c.json(await getOverview(c.env.DB, today, addDays(today, -29)));
});

adminRoutes.get('/sites/:id/stats', async (c) => {
  const id = c.req.param('id');
  if (!(await getSite(c.env.DB, id))) return c.json(apiError('not_found'), 404);
  const range = parseRange((k) => c.req.query(k));
  if ('error' in range) return c.json(range.error, 400);
  return c.json(await getSiteStats(c.env.DB, id, range.from, range.to));
});

/** 详细数据：跨站点的页面表格，site 为空表示全部站点 */
adminRoutes.get('/page-stats', async (c) => {
  const site = c.req.query('site') ?? '';
  if (site && !(await getSite(c.env.DB, site))) return c.json(apiError('not_found'), 404);
  const range = parseRange((k) => c.req.query(k));
  if ('error' in range) return c.json(range.error, 400);
  const sort = c.req.query('sort') as PageStatsSort | undefined;
  return c.json(
    await listPageStats(c.env.DB, {
      ...range,
      site,
      q: (c.req.query('q') ?? '').trim(),
      group: c.req.query('group') ?? '',
      sort: sort && PAGE_STATS_SORTS.includes(sort) ? sort : 'range_pv',
      dir: c.req.query('dir') === 'asc' ? 'asc' : 'desc',
      limit: Math.min(Math.max(Number(c.req.query('limit') ?? 50) || 50, 1), 200),
      offset: Math.max(Number(c.req.query('offset') ?? 0) || 0, 0),
    }),
  );
});

adminRoutes.all('*', (c) => c.json(apiError('not_found'), 404));
