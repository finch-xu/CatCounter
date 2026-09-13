import { describe, expect, it } from 'vitest';
import { ensureSchema } from '../src/db/schema';
import { testEnv } from './helpers';

describe('schema', () => {
  it('creates all tables idempotently', async () => {
    await ensureSchema(testEnv.DB);
    await ensureSchema(testEnv.DB);
    const rows = await testEnv.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    ).all<{ name: string }>();
    const names = rows.results.map((r) => r.name);
    for (const t of ['sites', 'tokens', 'pages', 'daily_site', 'daily_page', 'daily_dim', 'seen']) {
      expect(names).toContain(t);
    }
  });
});
