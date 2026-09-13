import type { DayPoint, DimStat, Overview, PageStat, SiteStats, SiteSummary } from '@catcounter/shared';
import { listSites } from './sites';

export function addDays(day: string, n: number): string {
  const d = new Date(day + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 生成 [from, to] 的连续日期列表，缺失的天补 0 */
function fillSeries(from: string, to: string, rows: DayPoint[]): DayPoint[] {
  const map = new Map(rows.map((r) => [r.day, r]));
  const out: DayPoint[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const r = map.get(d);
    out.push({ day: d, pv: r?.pv ?? 0, uv: r?.uv ?? 0 });
  }
  return out;
}

async function dimStats(db: D1Database, siteId: string, dim: string, from: string, to: string): Promise<DimStat[]> {
  const r = await db
    .prepare(
      `SELECT value, SUM(count) AS count FROM daily_dim
       WHERE site_id = ? AND dim = ? AND day BETWEEN ? AND ?
       GROUP BY value ORDER BY SUM(count) DESC, value ASC LIMIT 20`,
    )
    .bind(siteId, dim, from, to)
    .all<DimStat>();
  return r.results;
}

export async function getSiteStats(db: D1Database, siteId: string, from: string, to: string): Promise<SiteStats> {
  const series = await db
    .prepare('SELECT day, pv, uv FROM daily_site WHERE site_id = ? AND day BETWEEN ? AND ? ORDER BY day')
    .bind(siteId, from, to)
    .all<DayPoint>();
  const pages = await db
    .prepare(
      `SELECT d.path AS path, p.title AS title, SUM(d.pv) AS pv, SUM(d.uv) AS uv
       FROM daily_page d LEFT JOIN pages p ON p.site_id = d.site_id AND p.path = d.path
       WHERE d.site_id = ? AND d.day BETWEEN ? AND ?
       GROUP BY d.path ORDER BY SUM(d.pv) DESC, d.path ASC LIMIT 50`,
    )
    .bind(siteId, from, to)
    .all<PageStat>();
  const [referrers, countries, devices] = await Promise.all([
    dimStats(db, siteId, 'referrer', from, to),
    dimStats(db, siteId, 'country', from, to),
    dimStats(db, siteId, 'device', from, to),
  ]);
  return { from, to, series: fillSeries(from, to, series.results), pages: pages.results, referrers, countries, devices };
}

export async function getOverview(db: D1Database, today: string, fromDay: string): Promise<Overview> {
  const sites = await listSites(db);
  const todayRows = await db
    .prepare('SELECT site_id, pv, uv FROM daily_site WHERE day = ?')
    .bind(today)
    .all<{ site_id: string; pv: number; uv: number }>();
  const todayMap = new Map(todayRows.results.map((r) => [r.site_id, { pv: r.pv, uv: r.uv }]));

  const summaries: SiteSummary[] = sites.map((s) => ({ ...s, today: todayMap.get(s.id) ?? { pv: 0, uv: 0 } }));
  const totals = {
    sites: sites.length,
    today: summaries.reduce((a, s) => ({ pv: a.pv + s.today.pv, uv: a.uv + s.today.uv }), { pv: 0, uv: 0 }),
    all: sites.reduce((a, s) => ({ pv: a.pv + s.pv, uv: a.uv + s.uv }), { pv: 0, uv: 0 }),
  };

  const series = await db
    .prepare('SELECT day, SUM(pv) AS pv, SUM(uv) AS uv FROM daily_site WHERE day BETWEEN ? AND ? GROUP BY day ORDER BY day')
    .bind(fromDay, today)
    .all<DayPoint>();

  return { sites: summaries, totals, series: fillSeries(fromDay, today, series.results) };
}
