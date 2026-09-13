import type { Counts, CountsResponse, HitResponse } from '@catcounter/shared';

export interface HitInput {
  siteId: string;
  path: string;
  title: string;
  day: string;
  hash: string;
  nowSec: number;
  referrer: string;
  country: string;
  device: string;
  /** 传入则在同一 batch 里更新该 token 的 last_used_at */
  touchTokenId?: string;
}

/**
 * 一次有效访问。先查 seen 表判断是否新访客，再在一个 batch 里写全部表并读回计数。
 */
export async function recordHit(db: D1Database, input: HitInput): Promise<HitResponse> {
  const { siteId, path, day, hash, nowSec } = input;
  const title = input.title.slice(0, 200);

  const seen = await db
    .prepare("SELECT path FROM seen WHERE site_id = ? AND day = ? AND hash = ? AND path IN ('', ?)")
    .bind(siteId, day, hash, path)
    .all<{ path: string }>();
  const seenPaths = new Set(seen.results.map((r) => r.path));
  const newSite = seenPaths.has('') ? 0 : 1;
  const newPage = seenPaths.has(path) ? 0 : 1;

  const stmts: D1PreparedStatement[] = [
    db.prepare('UPDATE sites SET pv = pv + 1, uv = uv + ? WHERE id = ?').bind(newSite, siteId),
    db
      .prepare(
        `INSERT INTO pages (site_id, path, title, pv, uv, first_seen, last_seen)
         VALUES (?, ?, NULLIF(?, ''), 1, ?, ?, ?)
         ON CONFLICT(site_id, path) DO UPDATE SET
           pv = pages.pv + 1,
           uv = pages.uv + excluded.uv,
           title = COALESCE(excluded.title, pages.title),
           last_seen = excluded.last_seen`,
      )
      .bind(siteId, path, title, newPage, nowSec, nowSec),
    db
      .prepare(
        `INSERT INTO daily_site (site_id, day, pv, uv) VALUES (?, ?, 1, ?)
         ON CONFLICT(site_id, day) DO UPDATE SET pv = daily_site.pv + 1, uv = daily_site.uv + excluded.uv`,
      )
      .bind(siteId, day, newSite),
    db
      .prepare(
        `INSERT INTO daily_page (site_id, day, path, pv, uv) VALUES (?, ?, ?, 1, ?)
         ON CONFLICT(site_id, day, path) DO UPDATE SET pv = daily_page.pv + 1, uv = daily_page.uv + excluded.uv`,
      )
      .bind(siteId, day, path, newPage),
  ];

  const dims: Array<[string, string]> = [
    ['referrer', input.referrer],
    ['country', input.country],
    ['device', input.device],
  ];
  for (const [dim, value] of dims) {
    stmts.push(
      db
        .prepare(
          `INSERT INTO daily_dim (site_id, day, dim, value, count) VALUES (?, ?, ?, ?, 1)
           ON CONFLICT(site_id, day, dim, value) DO UPDATE SET count = daily_dim.count + 1`,
        )
        .bind(siteId, day, dim, value),
    );
  }

  if (newSite) {
    stmts.push(db.prepare("INSERT OR IGNORE INTO seen (site_id, day, hash, path) VALUES (?, ?, ?, '')").bind(siteId, day, hash));
  }
  if (newPage) {
    stmts.push(db.prepare('INSERT OR IGNORE INTO seen (site_id, day, hash, path) VALUES (?, ?, ?, ?)').bind(siteId, day, hash, path));
  }
  if (input.touchTokenId) {
    stmts.push(db.prepare('UPDATE tokens SET last_used_at = ? WHERE id = ?').bind(nowSec, input.touchTokenId));
  }

  stmts.push(db.prepare('SELECT pv, uv FROM sites WHERE id = ?').bind(siteId));
  stmts.push(db.prepare('SELECT pv, uv FROM pages WHERE site_id = ? AND path = ?').bind(siteId, path));

  const results = await db.batch<Counts>(stmts);
  const siteCounts = results[results.length - 2].results[0] ?? { pv: 0, uv: 0 };
  const pageCounts = results[results.length - 1].results[0] ?? { pv: 0, uv: 0 };
  return { site: { pv: siteCounts.pv, uv: siteCounts.uv }, page: { pv: pageCounts.pv, uv: pageCounts.uv } };
}

export async function readCounts(db: D1Database, siteId: string, paths: string[]): Promise<CountsResponse> {
  const siteRow = await db.prepare('SELECT pv, uv FROM sites WHERE id = ?').bind(siteId).first<Counts>();
  const site: Counts = siteRow ? { pv: siteRow.pv, uv: siteRow.uv } : { pv: 0, uv: 0 };
  const pages: Record<string, Counts> = {};
  for (const p of paths) pages[p] = { pv: 0, uv: 0 };
  if (paths.length > 0) {
    const placeholders = paths.map(() => '?').join(',');
    const r = await db
      .prepare(`SELECT path, pv, uv FROM pages WHERE site_id = ? AND path IN (${placeholders})`)
      .bind(siteId, ...paths)
      .all<{ path: string; pv: number; uv: number }>();
    for (const row of r.results) pages[row.path] = { pv: row.pv, uv: row.uv };
  }
  return { site, pages };
}
