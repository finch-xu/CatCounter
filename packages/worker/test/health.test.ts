import { describe, expect, it } from 'vitest';
import { api } from './helpers';

describe('health', () => {
  it('returns ok', async () => {
    const res = await api('/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('redirects root to /admin/', async () => {
    const res = await api('/', { redirect: 'manual' });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/admin/');
  });
});
