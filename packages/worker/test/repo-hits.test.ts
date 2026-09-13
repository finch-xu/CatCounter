import { describe, expect, it } from 'vitest';
import { recordHit, readCounts, type HitInput } from '../src/repo/hits';
import { createSite } from '../src/repo/sites';
import { createToken } from '../src/repo/tokens';
import { nowSec, testEnv } from './helpers';

const db = () => testEnv.DB;

async function site() {
  return createSite(db(), { name: 's', origins: ['https://a.com'] }, nowSec());
}

function hit(siteId: string, over: Partial<HitInput> = {}): HitInput {
  return {
    siteId,
    path: '/p/',
    title: '标题',
    day: '2026-09-13',
    hash: 'h1',
    nowSec: nowSec(),
    referrer: 'google.com',
    country: 'CN',
    device: 'desktop',
    ...over,
  };
}

describe('recordHit', () => {
  it('counts pv every time and uv once per visitor per day', async () => {
    const s = await site();
    const r1 = await recordHit(db(), hit(s.id));
    expect(r1).toEqual({ site: { pv: 1, uv: 1 }, page: { pv: 1, uv: 1 } });

    const r2 = await recordHit(db(), hit(s.id));
    expect(r2).toEqual({ site: { pv: 2, uv: 1 }, page: { pv: 2, uv: 1 } });

    const r3 = await recordHit(db(), hit(s.id, { hash: 'h2' }));
    expect(r3).toEqual({ site: { pv: 3, uv: 2 }, page: { pv: 3, uv: 2 } });
  });

  it('site uv is not bumped again when same visitor opens another page', async () => {
    const s = await site();
    await recordHit(db(), hit(s.id, { path: '/a/' }));
    const r = await recordHit(db(), hit(s.id, { path: '/b/' }));
    expect(r).toEqual({ site: { pv: 2, uv: 1 }, page: { pv: 1, uv: 1 } });
  });

  it('writes daily and dimension rows', async () => {
    const s = await site();
    await recordHit(db(), hit(s.id));
    await recordHit(db(), hit(s.id, { hash: 'h2', referrer: 'direct', device: 'mobile' }));

    const ds = await db().prepare('SELECT pv, uv FROM daily_site WHERE site_id = ? AND day = ?')
      .bind(s.id, '2026-09-13').first<{ pv: number; uv: number }>();
    expect(ds).toEqual({ pv: 2, uv: 2 });

    const dp = await db().prepare('SELECT pv, uv FROM daily_page WHERE site_id = ? AND day = ? AND path = ?')
      .bind(s.id, '2026-09-13', '/p/').first<{ pv: number; uv: number }>();
    expect(dp).toEqual({ pv: 2, uv: 2 });

    const dims = await db().prepare('SELECT dim, value, count FROM daily_dim WHERE site_id = ? ORDER BY dim, value')
      .bind(s.id).all<{ dim: string; value: string; count: number }>();
    expect(dims.results).toEqual([
      { dim: 'country', value: 'CN', count: 2 },
      { dim: 'device', value: 'desktop', count: 1 },
      { dim: 'device', value: 'mobile', count: 1 },
      { dim: 'referrer', value: 'direct', count: 1 },
      { dim: 'referrer', value: 'google.com', count: 1 },
    ]);
  });

  it('keeps existing title when new title is empty', async () => {
    const s = await site();
    await recordHit(db(), hit(s.id, { title: '第一' }));
    await recordHit(db(), hit(s.id, { title: '' }));
    const row = await db().prepare('SELECT title FROM pages WHERE site_id = ? AND path = ?')
      .bind(s.id, '/p/').first<{ title: string }>();
    expect(row?.title).toBe('第一');
  });

  it('truncates title to 200 characters', async () => {
    const s = await site();
    await recordHit(db(), hit(s.id, { title: 'x'.repeat(250) }));
    const row = await db().prepare('SELECT title FROM pages WHERE site_id = ? AND path = ?')
      .bind(s.id, '/p/').first<{ title: string }>();
    expect(row?.title).toHaveLength(200);
  });

  it('touches token last_used_at when asked', async () => {
    const s = await site();
    const t = await createToken(db(), s.id, 't', nowSec());
    await recordHit(db(), hit(s.id, { touchTokenId: t.id }));
    const row = await db().prepare('SELECT last_used_at FROM tokens WHERE id = ?').bind(t.id)
      .first<{ last_used_at: number | null }>();
    expect(row?.last_used_at).not.toBeNull();
  });
});

describe('readCounts', () => {
  it('returns zeros for unknown pages', async () => {
    const s = await site();
    await recordHit(db(), hit(s.id, { path: '/a/' }));
    const r = await readCounts(db(), s.id, ['/a/', '/zzz/']);
    expect(r).toEqual({ site: { pv: 1, uv: 1 }, pages: { '/a/': { pv: 1, uv: 1 }, '/zzz/': { pv: 0, uv: 0 } } });
  });

  it('works with empty path list', async () => {
    const s = await site();
    expect(await readCounts(db(), s.id, [])).toEqual({ site: { pv: 0, uv: 0 }, pages: {} });
  });
});
