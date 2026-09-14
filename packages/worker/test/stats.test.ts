import { describe, expect, it } from 'vitest';
import type { Overview, PageStatsList, SiteStats } from '@catcounter/shared';
import { recordHit, type HitInput } from '../src/repo/hits';
import { createSite, setPageCounters } from '../src/repo/sites';
import { addDays, getOverview, getSiteStats, listPageStats, type PageStatsQuery } from '../src/repo/stats';
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

describe('listPageStats', () => {
  const RANGE = { from: '2026-09-10', to: '2026-09-12' };
  function query(over: Partial<PageStatsQuery> = {}): PageStatsQuery {
    return { ...RANGE, site: '', q: '', group: '', sort: 'range_pv', dir: 'desc', limit: 50, offset: 0, ...over };
  }

  /** /posts/a/ 区间内 3 PV；/posts/b/ 区间内 1 PV、区间外 5 PV；/about/ 只在区间外；/ 只有导入的累计值 */
  async function seed() {
    const s = await createSite(db(), { name: 's', origins: ['https://a.com'] }, nowSec());
    await recordHit(db(), hit(s.id, { day: '2026-09-10', hash: 'a', path: '/posts/a/', title: 'Alpha', nowSec: 100 }));
    await recordHit(db(), hit(s.id, { day: '2026-09-10', hash: 'b', path: '/posts/a/', title: 'Alpha', nowSec: 200 }));
    await recordHit(db(), hit(s.id, { day: '2026-09-11', hash: 'a', path: '/posts/a/', title: 'Alpha', nowSec: 300 }));
    await recordHit(db(), hit(s.id, { day: '2026-09-12', hash: 'a', path: '/posts/b/', title: '100%_off', nowSec: 400 }));
    for (const h of ['a', 'b', 'c', 'd', 'e']) {
      await recordHit(db(), hit(s.id, { day: '2026-09-20', hash: h, path: '/posts/b/', title: '100%_off', nowSec: 500 }));
    }
    await recordHit(db(), hit(s.id, { day: '2026-09-01', hash: 'a', path: '/about/', title: 'About', nowSec: 50 }));
    await setPageCounters(db(), s.id, '/', { pv: 9, uv: 7 }, 10);
    return s;
  }

  it('lists every page of a site with range and cumulative counts, sorted by range PV', async () => {
    const s = await seed();
    const r: PageStatsList = await listPageStats(db(), query({ site: s.id }));
    expect(r).toMatchObject({ ...RANGE, total: 4 });
    const site = { site_id: s.id, site_name: 's' };
    expect(r.rows).toEqual([
      // 同一访客在不同日期会再算一次 UV，所以 /posts/a/ 的累计 UV 是 3
      { ...site, path: '/posts/a/', title: 'Alpha', range_pv: 3, range_uv: 3, pv: 3, uv: 3, first_seen: 100, last_seen: 300 },
      { ...site, path: '/posts/b/', title: '100%_off', range_pv: 1, range_uv: 1, pv: 6, uv: 6, first_seen: 400, last_seen: 500 },
      { ...site, path: '/', title: null, range_pv: 0, range_uv: 0, pv: 9, uv: 7, first_seen: 10, last_seen: 10 },
      { ...site, path: '/about/', title: 'About', range_pv: 0, range_uv: 0, pv: 1, uv: 1, first_seen: 50, last_seen: 50 },
    ]);
  });

  it('sorts by any whitelisted column in both directions', async () => {
    const s = await seed();
    const paths = async (over: Partial<PageStatsQuery>) =>
      (await listPageStats(db(), query({ site: s.id, ...over }))).rows.map((x) => x.path);
    expect(await paths({ sort: 'pv', dir: 'desc' })).toEqual(['/', '/posts/b/', '/posts/a/', '/about/']);
    expect(await paths({ sort: 'last_seen', dir: 'asc' })).toEqual(['/', '/about/', '/posts/a/', '/posts/b/']);
    expect(await paths({ sort: 'path', dir: 'asc' })).toEqual(['/', '/about/', '/posts/a/', '/posts/b/']);
  });

  it('searches title or path and treats LIKE wildcards literally', async () => {
    const s = await seed();
    const paths = async (q: string) => (await listPageStats(db(), query({ site: s.id, q }))).rows.map((x) => x.path);
    expect(await paths('alpha')).toEqual(['/posts/a/']);
    expect(await paths('about')).toEqual(['/about/']);
    expect(await paths('%_')).toEqual(['/posts/b/']);
    expect(await paths('_')).toEqual(['/posts/b/']);
  });

  it('reports groups with at least two pages and filters by group', async () => {
    const s = await seed();
    const r = await listPageStats(db(), query({ site: s.id, group: '/posts/' }));
    expect(r.groups).toEqual([{ prefix: '/posts/', count: 2 }]);
    expect(r.total).toBe(2);
    expect(r.rows.map((x) => x.path)).toEqual(['/posts/a/', '/posts/b/']);
    const root = await listPageStats(db(), query({ site: s.id, group: '/' }));
    expect(root.rows.map((x) => x.path)).toEqual(['/']);
  });

  it('paginates while total counts every match', async () => {
    const s = await seed();
    const r = await listPageStats(db(), query({ site: s.id, limit: 2, offset: 2 }));
    expect(r.total).toBe(4);
    expect(r.rows.map((x) => x.path)).toEqual(['/', '/about/']);
  });

  it('lists pages across all sites when no site is given', async () => {
    const one = await createSite(db(), { name: 'Blog B', origins: ['https://b.com'] }, nowSec());
    const two = await createSite(db(), { name: 'Blog A', origins: ['https://c.com'] }, nowSec());
    // 两个站点有同名路径；各自只有一个 /xsite-group/ 页面，合起来才够成一个分组
    await recordHit(db(), hit(one.id, { day: '2026-09-10', hash: 'a', path: '/xsite-group/p/', title: 'xsite' }));
    await recordHit(db(), hit(one.id, { day: '2026-09-11', hash: 'a', path: '/xsite-group/p/', title: 'xsite' }));
    await recordHit(db(), hit(two.id, { day: '2026-09-10', hash: 'a', path: '/xsite-group/p/', title: 'xsite' }));

    const all = await listPageStats(db(), query({ q: 'xsite', sort: 'site', dir: 'asc' }));
    expect(all.total).toBe(2);
    expect(all.rows.map((x) => [x.site_name, x.path, x.range_pv])).toEqual([
      ['Blog A', '/xsite-group/p/', 1],
      ['Blog B', '/xsite-group/p/', 2],
    ]);
    expect(all.groups).toContainEqual({ prefix: '/xsite-group/', count: 2 });

    const single = await listPageStats(db(), query({ site: one.id }));
    expect(single.groups).toEqual([]);
    expect(single.rows.map((x) => x.site_id)).toEqual([one.id]);
  });
});

describe('stats routes', () => {
  it('serves the page table with site filter, defaults, fallbacks and validation', async () => {
    const cookie = await login();
    const created = await (await adminApi('/sites', cookie, { method: 'POST', body: JSON.stringify({ name: 'pt', origins: ['https://pt.com'] }) })).json<{ site: { id: string } }>();
    const id = created.site.id;
    await recordHit(db(), hit(id, { day: '2026-09-10', hash: 'a', path: '/posts/a/' }));
    await recordHit(db(), hit(id, { day: '2026-09-10', hash: 'a', path: '/posts/b/' }));

    const res = await adminApi(`/page-stats?site=${id}&from=2026-09-10&to=2026-09-10&sort=nope&dir=sideways&limit=9999&offset=-3`, cookie);
    expect(res.status).toBe(200);
    const body = await res.json<PageStatsList>();
    expect(body.total).toBe(2);
    expect(body.rows).toHaveLength(2);

    const one = await (await adminApi(`/page-stats?site=${id}&from=2026-09-10&to=2026-09-10&limit=1&sort=path&dir=asc`, cookie)).json<PageStatsList>();
    expect(one.rows.map((x) => x.path)).toEqual(['/posts/a/']);

    const all = await (await adminApi('/page-stats?from=2026-09-10&to=2026-09-10&limit=200', cookie)).json<PageStatsList>();
    expect(all.rows.filter((x) => x.site_id === id)).toHaveLength(2);

    const defaults = await (await adminApi('/page-stats', cookie)).json<PageStatsList>();
    expect(defaults.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(addDays(defaults.from, 29)).toBe(defaults.to);

    expect((await adminApi('/page-stats?from=bad', cookie)).status).toBe(400);
    expect((await adminApi('/page-stats?from=2026-09-10&to=2026-09-01', cookie)).status).toBe(400);
    expect((await adminApi('/page-stats?site=missing', cookie)).status).toBe(404);
  });

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
    const tooLong = await adminApi(`/sites/${id}/stats?from=2025-01-01&to=2026-01-02`, cookie); // 367 天
    expect(tooLong.status).toBe(400);
    expect(await tooLong.json()).toEqual({
      code: 'date_range_too_long', params: { max: 366 }, error: 'Date range can be at most 366 days',
    });
    expect((await adminApi(`/sites/${id}/stats?from=2026-13-45`, cookie)).status).toBe(400); // 格式合法但日历非法
    expect((await adminApi(`/sites/${id}/stats?from=2026-02-01&to=2026-02-30`, cookie)).status).toBe(400); // 2 月没有 30 号
  });
});
