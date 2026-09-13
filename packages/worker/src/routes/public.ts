import { Hono } from 'hono';
import { normalizePath, type HitRequest } from '@catcounter/shared';
import type { Env } from '../env';
import { dailySalt, dayOf, visitorHash } from '../lib/hash';
import { originAllowed } from '../lib/origin';
import { referrerOf } from '../lib/referrer';
import { deviceOf, isBot } from '../lib/ua';
import { readCounts, recordHit } from '../repo/hits';
import { findActiveToken } from '../repo/tokens';

export const publicRoutes = new Hono<{ Bindings: Env }>();

const MAX_PATH = 512;
const MAX_PATHS = 50;
const TOKEN_TOUCH_INTERVAL = 3600;

function corsHeaders(origin: string): Record<string, string> {
  return { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' };
}

function countryOf(req: Request): string {
  const cf = (req as Request & { cf?: { country?: string } }).cf;
  const c = cf?.country;
  return typeof c === 'string' && c.length === 2 ? c.toUpperCase() : 'XX';
}

publicRoutes.post('/hit', async (c) => {
  let body: Partial<HitRequest>;
  try {
    body = JSON.parse(await c.req.text());
  } catch {
    return c.json({ error: 'bad json' }, 400);
  }
  if (!body || typeof body.token !== 'string' || typeof body.path !== 'string') {
    return c.json({ error: 'token and path required' }, 400);
  }

  const found = await findActiveToken(c.env.DB, body.token);
  if (!found) return c.json({ error: 'invalid token' }, 403);
  const origin = c.req.header('origin');
  if (!originAllowed(found.site.origins, origin)) return c.json({ error: 'origin not allowed' }, 403);
  const cors = corsHeaders(origin!);

  const path = normalizePath(body.path).slice(0, MAX_PATH);
  const ua = c.req.header('user-agent') ?? '';
  const nowSec = Math.floor(Date.now() / 1000);

  if (isBot(ua)) {
    const counts = await readCounts(c.env.DB, found.site.id, [path]);
    return c.json({ site: counts.site, page: counts.pages[path] }, 200, cors);
  }

  const day = dayOf(nowSec);
  const salt = await dailySalt(c.env.SESSION_SECRET, day);
  const ip = c.req.header('cf-connecting-ip') ?? '0.0.0.0';
  const hash = await visitorHash(salt, ip, ua);
  const shouldTouch = !found.token.last_used_at || nowSec - found.token.last_used_at > TOKEN_TOUCH_INTERVAL;

  const result = await recordHit(c.env.DB, {
    siteId: found.site.id,
    path,
    title: typeof body.title === 'string' ? body.title : '',
    day,
    hash,
    nowSec,
    referrer: referrerOf(typeof body.referrer === 'string' ? body.referrer : undefined, found.site.origins),
    country: countryOf(c.req.raw),
    device: deviceOf(ua),
    touchTokenId: shouldTouch ? found.token.id : undefined,
  });
  return c.json(result, 200, cors);
});

publicRoutes.get('/counts', async (c) => {
  const token = c.req.query('token') ?? '';
  const rawPaths = (c.req.query('paths') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!token) return c.json({ error: 'token required' }, 400);
  if (rawPaths.length > MAX_PATHS) return c.json({ error: 'too many paths' }, 400);

  const found = await findActiveToken(c.env.DB, token);
  if (!found) return c.json({ error: 'invalid token' }, 403);
  const origin = c.req.header('origin');
  if (!originAllowed(found.site.origins, origin)) return c.json({ error: 'origin not allowed' }, 403);

  const paths = Array.from(new Set(rawPaths.map((p) => normalizePath(p).slice(0, MAX_PATH))));
  const counts = await readCounts(c.env.DB, found.site.id, paths);
  return c.json(counts, 200, corsHeaders(origin!));
});
