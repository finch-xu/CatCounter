import type {
  DayPoint, DimStat, Overview, PageGroup, PageStat, PageStatsList, PageStatsRow, PageStatsSort, SiteStats, SiteSummary,
} from '@catcounter/shared';
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

export interface PageStatsQuery {
  from: string;
  to: string;
  /** 站点 id，空字符串表示全部站点 */
  site: string;
  /** 匹配标题或路径，空字符串表示不筛选 */
  q: string;
  /** PageGroup.prefix，空字符串表示全部分组 */
  group: string;
  sort: PageStatsSort;
  dir: 'asc' | 'desc';
  limit: number;
  offset: number;
}

export const PAGE_STATS_SORTS: readonly PageStatsSort[] = [
  'range_pv', 'range_uv', 'pv', 'uv', 'first_seen', 'last_seen', 'path', 'site',
];

/** 排序字段只能来自这张表，拼进 SQL 前不会碰到用户输入 */
const SORT_COLUMNS: Record<PageStatsSort, string> = {
  range_pv: 'range_pv', range_uv: 'range_uv', pv: 'p.pv', uv: 'p.uv',
  first_seen: 'p.first_seen', last_seen: 'p.last_seen', path: 'p.path', site: 's.name',
};

/** 路径第一段：/posts/a/ → /posts/，/about/ → /about/，/ 和 /robots.txt 这类没有第二个斜杠的保持原样 */
const GROUP_EXPR = `CASE WHEN instr(substr(p.path, 2), '/') = 0 THEN p.path
  ELSE substr(p.path, 1, instr(substr(p.path, 2), '/') + 1) END`;

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (ch) => '\\' + ch);
}

/** 详细数据表格：以 pages 为主表，区间内没有访问的页面区间列为 0；不指定站点时跨全部站点 */
export async function listPageStats(db: D1Database, query: PageStatsQuery): Promise<PageStatsList> {
  const where: string[] = [];
  const args: unknown[] = [];
  if (query.site) {
    where.push('p.site_id = ?');
    args.push(query.site);
  }
  if (query.q) {
    const like = `%${escapeLike(query.q)}%`;
    where.push("(p.path LIKE ? ESCAPE '\\' OR p.title LIKE ? ESCAPE '\\')");
    args.push(like, like);
  }
  if (query.group) {
    where.push(`${GROUP_EXPR} = ?`);
    args.push(query.group);
  }
  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const dir = query.dir === 'asc' ? 'ASC' : 'DESC';
  // daily_page 只有 (site_id, day) 索引；不选站点时用 IN 子查询让 SQLite 按站点逐个走索引，避免全表扫描
  const dailySite = query.site ? 'site_id = ?' : 'site_id IN (SELECT id FROM sites)';
  const dailyArgs = query.site ? [query.site] : [];
  const siteOnly = query.site ? 'WHERE p.site_id = ?' : '';

  const [count, rows, groups] = await db.batch([
    db.prepare(`SELECT COUNT(*) AS n FROM pages p JOIN sites s ON s.id = p.site_id ${whereSql}`).bind(...args),
    db
      .prepare(
        `SELECT p.site_id AS site_id, s.name AS site_name, p.path AS path, p.title AS title,
           COALESCE(d.pv, 0) AS range_pv, COALESCE(d.uv, 0) AS range_uv,
           p.pv AS pv, p.uv AS uv, p.first_seen AS first_seen, p.last_seen AS last_seen
         FROM pages p
         JOIN sites s ON s.id = p.site_id
         LEFT JOIN (
           SELECT site_id, path, SUM(pv) AS pv, SUM(uv) AS uv FROM daily_page
           WHERE ${dailySite} AND day BETWEEN ? AND ? GROUP BY site_id, path
         ) d ON d.site_id = p.site_id AND d.path = p.path
         ${whereSql}
         ORDER BY ${SORT_COLUMNS[query.sort]} ${dir}, p.path ASC, s.name ASC
         LIMIT ? OFFSET ?`,
      )
      .bind(...dailyArgs, query.from, query.to, ...args, query.limit, query.offset),
    db
      .prepare(
        `SELECT ${GROUP_EXPR} AS prefix, COUNT(*) AS count FROM pages p JOIN sites s ON s.id = p.site_id
         ${siteOnly} GROUP BY prefix HAVING COUNT(*) >= 2 ORDER BY count DESC, prefix ASC`,
      )
      .bind(...dailyArgs),
  ]);

  return {
    from: query.from,
    to: query.to,
    total: (count.results[0] as { n: number } | undefined)?.n ?? 0,
    rows: rows.results as PageStatsRow[],
    groups: groups.results as PageGroup[],
  };
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
