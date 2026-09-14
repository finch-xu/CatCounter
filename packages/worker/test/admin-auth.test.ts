import { describe, expect, it } from 'vitest';
import { adminApi, api, login } from './helpers';

describe('admin auth', () => {
  it('rejects wrong password', async () => {
    const res = await api('/admin/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'wrong' }),
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: 'wrong_password', error: 'Incorrect password' });
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('sets a secure httponly cookie on success', async () => {
    const res = await api('/admin/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'test-password' }),
    });
    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toMatch(/^cc_session=/);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/admin');
  });

  it('me reports login state', async () => {
    expect((await api('/admin/api/me')).status).toBe(401);
    const cookie = await login();
    const res = await adminApi('/me', cookie);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('logout clears cookie', async () => {
    const cookie = await login();
    const res = await adminApi('/logout', cookie, { method: 'POST' });
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toMatch(/cc_session=;/);
  });

  it('protects other admin routes', async () => {
    expect((await api('/admin/api/sites')).status).toBe(401);
    expect((await api('/admin/api/sites', { headers: { cookie: 'cc_session=bad.sig' } })).status).toBe(401);
  });
});
