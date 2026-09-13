import { describe, expect, it } from 'vitest';
import { runCleanup } from '../src/cron';
import { recordHit, type HitInput } from '../src/repo/hits';
import { createSite, updateSite } from '../src/repo/sites';
import { nowSec, testEnv } from './helpers';

const db = () => testEnv.DB;

function hit(siteId: string, over: Partial<HitInput>): HitInput {
  return { siteId, path: '/p/', title: 't', day: '2026-09-01', hash: 'h', nowSec: nowSec(),
    referrer: 'direct', country: 'CN', device: 'desktop', ...over };
}

describe('runCleanup', () => {
  it('deletes seen rows before today', async () => {
    const s = await createSite(db(), { name: 's', origins: ['https://a.com'] }, nowSec());
    await recordHit(db(), hit(s.id, { day: '2026-09-12', hash: 'old' }));
    await recordHit(db(), hit(s.id, { day: '2026-09-13', hash: 'new' }));
    await runCleanup(db(), '2026-09-13');
    const rows = await db().prepare('SELECT day FROM seen WHERE site_id = ?').bind(s.id).all<{ day: string }>();
    expect(rows.results.map((r) => r.day)).toEqual(['2026-09-13', '2026-09-13']);
  });

  it('prunes daily_page beyond retention only for sites that set it', async () => {
    const keep = await createSite(db(), { name: 'k', origins: ['https://a.com'] }, nowSec());
    const prune = await createSite(db(), { name: 'p', origins: ['https://b.com'] }, nowSec());
    await updateSite(db(), prune.id, { retention_days: 7 });
    for (const id of [keep.id, prune.id]) {
      await recordHit(db(), hit(id, { day: '2026-09-01', hash: 'a' }));
      await recordHit(db(), hit(id, { day: '2026-09-10', hash: 'a' }));
    }
    await runCleanup(db(), '2026-09-13');
    const days = async (id: string) =>
      (await db().prepare('SELECT day FROM daily_page WHERE site_id = ? ORDER BY day').bind(id).all<{ day: string }>()).results.map((r) => r.day);
    expect(await days(keep.id)).toEqual(['2026-09-01', '2026-09-10']);
    expect(await days(prune.id)).toEqual(['2026-09-10']);
    // daily_site 不受保留天数影响
    const ds = await db().prepare('SELECT COUNT(*) AS n FROM daily_site WHERE site_id = ?').bind(prune.id).first<{ n: number }>();
    expect(ds?.n).toBe(2);
  });
});
