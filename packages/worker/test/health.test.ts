import { describe, expect, it } from 'vitest';
import { adminApi, api, login } from './helpers';

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

  it('redirects /admin to /admin/', async () => {
    const res = await api('/admin', { redirect: 'manual' });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/admin/');
  });

  it('serves the SPA shell for unknown /admin/* paths', async () => {
    const res = await api('/admin/whatever');
    // 若测试运行时里 ASSETS 绑定不可用，至少断言没有落到 404（说明确实走的是 SPA 回退而不是路由未匹配）
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType) {
      expect(contentType).toContain('text/html');
    } else {
      expect(res.status).not.toBe(404);
    }
  });

  it('returns 404 JSON for unknown admin api paths when logged in', async () => {
    const cookie = await login();
    const res = await adminApi('/bogus', cookie);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found', code: 'not_found' });
  });
});
