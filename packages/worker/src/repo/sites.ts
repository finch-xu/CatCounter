import type { PageRow, Site } from '@catcounter/shared';

export interface SiteRow {
  id: string;
  name: string;
  origins: string;
  pv: number;
  uv: number;
  retention_days: number | null;
  created_at: number;
}

export function rowToSite(row: SiteRow): Site {
  let origins: string[] = [];
  try {
    const parsed = JSON.parse(row.origins);
    if (Array.isArray(parsed)) origins = parsed.filter((x) => typeof x === 'string');
  } catch {
    origins = [];
  }
  return {
    id: row.id,
    name: row.name,
    origins,
    pv: row.pv,
    uv: row.uv,
    retention_days: row.retention_days,
    created_at: row.created_at,
  };
}

export async function listSites(db: D1Database): Promise<Site[]> {
  const r = await db.prepare('SELECT * FROM sites ORDER BY created_at ASC').all<SiteRow>();
  return r.results.map(rowToSite);
}

export async function getSite(db: D1Database, id: string): Promise<Site | null> {
  const row = await db.prepare('SELECT * FROM sites WHERE id = ?').bind(id).first<SiteRow>();
  return row ? rowToSite(row) : null;
}

export async function createSite(
  db: D1Database,
  input: { name: string; origins: string[] },
  nowSec: number,
): Promise<Site> {
  const id = crypto.randomUUID();
  await db
    .prepare('INSERT INTO sites (id, name, origins, created_at) VALUES (?, ?, ?, ?)')
    .bind(id, input.name, JSON.stringify(input.origins), nowSec)
    .run();
  return (await getSite(db, id))!;
}

export async function updateSite(
  db: D1Database,
  id: string,
  patch: { name?: string; origins?: string[]; retention_days?: number | null },
): Promise<Site | null> {
  const sets: string[] = [];
  const args: unknown[] = [];
  if (patch.name !== undefined) { sets.push('name = ?'); args.push(patch.name); }
  if (patch.origins !== undefined) { sets.push('origins = ?'); args.push(JSON.stringify(patch.origins)); }
  if (patch.retention_days !== undefined) { sets.push('retention_days = ?'); args.push(patch.retention_days); }
  if (sets.length > 0) {
    await db.prepare(`UPDATE sites SET ${sets.join(', ')} WHERE id = ?`).bind(...args, id).run();
  }
  return getSite(db, id);
}

export async function deleteSite(db: D1Database, id: string): Promise<void> {
  const tables = ['tokens', 'pages', 'daily_site', 'daily_page', 'daily_dim', 'seen'];
  await db.batch([
    ...tables.map((t) => db.prepare(`DELETE FROM ${t} WHERE site_id = ?`).bind(id)),
    db.prepare('DELETE FROM sites WHERE id = ?').bind(id),
  ]);
}

export async function setSiteCounters(
  db: D1Database,
  id: string,
  c: { pv?: number; uv?: number },
): Promise<void> {
  await db
    .prepare('UPDATE sites SET pv = COALESCE(?, pv), uv = COALESCE(?, uv) WHERE id = ?')
    .bind(c.pv ?? null, c.uv ?? null, id)
    .run();
}

export async function setPageCounters(
  db: D1Database,
  id: string,
  path: string,
  c: { pv?: number; uv?: number },
  nowSec: number,
): Promise<void> {
  await db.batch([
    db
      .prepare(
        'INSERT OR IGNORE INTO pages (site_id, path, pv, uv, first_seen, last_seen) VALUES (?, ?, 0, 0, ?, ?)',
      )
      .bind(id, path, nowSec, nowSec),
    db
      .prepare('UPDATE pages SET pv = COALESCE(?, pv), uv = COALESCE(?, uv) WHERE site_id = ? AND path = ?')
      .bind(c.pv ?? null, c.uv ?? null, id, path),
  ]);
}

export async function listPages(
  db: D1Database,
  id: string,
  q: string,
  limit: number,
  offset: number,
): Promise<PageRow[]> {
  const r = await db
    .prepare(
      `SELECT path, title, pv, uv, last_seen FROM pages
       WHERE site_id = ? AND path LIKE ?
       ORDER BY pv DESC LIMIT ? OFFSET ?`,
    )
    .bind(id, `%${q}%`, limit, offset)
    .all<PageRow>();
  return r.results;
}
