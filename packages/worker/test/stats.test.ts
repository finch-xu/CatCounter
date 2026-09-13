import { describe, expect, it } from 'vitest';
import type { Overview, SiteStats } from '@catcounter/shared';
import { recordHit, type HitInput } from '../src/repo/hits';
import { createSite } from '../src/repo/sites';
import { addDays, getOverview, getSiteStats } from '../src/repo/stats';
import { adminApi, login, nowSec, testEnv } from './helpers';

const db = () => testEnv.DB;

function hit(siteId: string, over: Partial<HitInput>): HitInput {
  return { siteId, path: '/p/', title: 't', day: '2026-09-10', hash: 'h', nowSec: nowSec(),
    referrer: 'direct', country: 'CN', device: 'desktop', ...over };
}

describe('addDays', () => {
  it('moves across month boundary', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('getSiteStats', () => {
  it('aggregates series, pages and dims within range', async () => {
    const s = await createSite(db(), { name: 's', origins: ['https://a.com'] }, nowSec());
    await recordHit(db(), hit(s.id, { day: '2026-09-10', hash: 'a', path: '/x/', referrer: 'google.com' }));
    await recordHit(db(), hit(s.id, { day: '2026-09-10', hash: 'b', path: '/x/', device: 'mobile' }));
    await recordHit(db(), hit(s.id, { day: '2026-09-11', hash: 'a', path: '/y/', country: 'US' }));
    await recordHit(db(), hit(s.id, { day: '2026-09-20', hash: 'a', path: '/y/' })); // 范围外

    const st: SiteStats = await getSiteStats(db(), s.id, '2026-09-10', '2026-09-12');
    expect(st.series).toEqual([
      { day: '2026-09-10', pv: 2, uv: 2 },
      { day: '2026-09-11', pv: 1, uv: 1 },
      { day: '2026-09-12', pv: 0, uv: 0 },
    ]);
    expect(st.pages).toEqual([
      { path: '/x/', title: 't', pv: 2, uv: 2 },
      { path: '/y/', title: 't', pv: 1, uv: 1 },
    ]);
    expect(st.referrers).toEqual([{ value: 'direct', count: 2 }, { value: 'google.com', count: 1 }]);
    expect(st.countries).toEqual([{ value: 'CN', count: 2 }, { value: 'US', count: 1 }]);
    expect(st.devices).toEqual([{ value: 'desktop', count: 2 }, { value: 'mobile', count: 1 }]);
  });
});

describe('getOverview', () => {
  it('sums across sites and reports today', async () => {
    const s1 = await createSite(db(), { name: 'one', origins: ['https://a.com'] }, nowSec());
    const s2 = await createSite(db(), { name: 'two', origins: ['https://b.com'] }, nowSec());
    await recordHit(db(), hit(s1.id, { day: '2026-09-13', hash: 'a' }));
    await recordHit(db(), hit(s2.id, { day: '2026-09-13', hash: 'a' }));
    await recordHit(db(), hit(s2.id, { day: '2026-09-12', hash: 'a' }));

    const ov: Overview = await getOverview(db(), '2026-09-13', '2026-09-12');
    const one = ov.sites.find((s) => s.id === s1.id)!;
    const two = ov.sites.find((s) => s.id === s2.id)!;
    expect(one.today).toEqual({ pv: 1, uv: 1 });
    expect(two.today).toEqual({ pv: 1, uv: 1 });
    expect(two.pv).toBe(2);
    expect(ov.totals.sites).toBeGreaterThanOrEqual(2);
    expect(ov.series.find((p) => p.day === '2026-09-13')!.pv).toBeGreaterThanOrEqual(2);
    expect(ov.series.find((p) => p.day === '2026-09-12')!.pv).toBeGreaterThanOrEqual(1);
    expect(ov.series).toHaveLength(2);
  });
});

describe('stats routes', () => {
  it('serves overview and site stats with defaults and validation', async () => {
    const cookie = await login();
    const created = await (await adminApi('/sites', cookie, { method: 'POST', body: JSON.stringify({ name: 'r', origins: ['https://r.com'] }) })).json<{ site: { id: string } }>();
    const id = created.site.id;

    const ov = await adminApi('/overview', cookie);
    expect(ov.status).toBe(200);
    expect((await ov.json<Overview>()).series).toHaveLength(30);

    const st = await adminApi(`/sites/${id}/stats`, cookie);
    expect(st.status).toBe(200);
    const body = await st.json() as SiteStats;
    expect(body.series).toHaveLength(30);
    expect(body.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    expect((await adminApi(`/sites/${id}/stats?from=bad`, cookie)).status).toBe(400);
    expect((await adminApi(`/sites/${id}/stats?from=2026-09-10&to=2026-09-01`, cookie)).status).toBe(400);
    expect((await adminApi(`/sites/${id}/stats?from=2020-01-01&to=2026-09-01`, cookie)).status).toBe(400);
    expect((await adminApi(`/sites/${id}/stats?from=2025-01-01&to=2026-01-01`, cookie)).status).toBe(200); // 恰好 366 天
    expect((await adminApi(`/sites/${id}/stats?from=2025-01-01&to=2026-01-02`, cookie)).status).toBe(400); // 367 天
  });
});
