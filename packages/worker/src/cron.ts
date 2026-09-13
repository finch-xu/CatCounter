import { addDays } from './repo/stats';

export async function runCleanup(
  db: D1Database,
  today: string,
): Promise<{ seenDeleted: number; dailyPageDeleted: number }> {
  const seen = await db.prepare('DELETE FROM seen WHERE day < ?').bind(today).run();

  const sites = await db
    .prepare('SELECT id, retention_days FROM sites WHERE retention_days IS NOT NULL')
    .all<{ id: string; retention_days: number }>();
  let dailyPageDeleted = 0;
  for (const s of sites.results) {
    const cutoff = addDays(today, -s.retention_days);
    const r = await db.prepare('DELETE FROM daily_page WHERE site_id = ? AND day < ?').bind(s.id, cutoff).run();
    dailyPageDeleted += r.meta.changes ?? 0;
  }
  return { seenDeleted: seen.meta.changes ?? 0, dailyPageDeleted };
}
