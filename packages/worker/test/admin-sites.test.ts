import { describe, expect, it } from 'vitest';
import type { Site, Token } from '@catcounter/shared';
import { adminApi, login } from './helpers';

async function createSite(cookie: string, body: unknown = { name: '博客', origins: ['https://blog.example.com/'] }) {
  const res = await adminApi('/sites', cookie, { method: 'POST', body: JSON.stringify(body) });
  return { res, data: (res.status === 201 ? await res.json() : null) as { site: Site; token: Token } | null };
}

describe('admin sites', () => {
  it('creates a site with normalized origins and a default token', async () => {
    const cookie = await login();
    const { res, data } = await createSite(cookie);
    expect(res.status).toBe(201);
    expect(data!.site.origins).toEqual(['https://blog.example.com']);
    expect(data!.token.token).toMatch(/^cc_/);
    expect(data!.token.name).toBe('default');

    const list = await (await adminApi('/sites', cookie)).json() as Site[];
    expect(list.some((s) => s.id === data!.site.id)).toBe(true);

    const one = await adminApi(`/sites/${data!.site.id}`, cookie);
    expect(one.status).toBe(200);
    expect((await one.json<Site>()).name).toBe('博客');
  });

  it('validates input', async () => {
    const cookie = await login();
    const noName = (await createSite(cookie, { name: '', origins: ['https://a.com'] })).res;
    expect(noName.status).toBe(400);
    expect(await noName.json()).toMatchObject({ code: 'site_name_required', error: expect.any(String) });
    expect((await createSite(cookie, { name: 'x', origins: [] })).res.status).toBe(400);
    const badOrigin = (await createSite(cookie, { name: 'x', origins: ['not-an-origin'] })).res;
    expect(badOrigin.status).toBe(400);
    expect(await badOrigin.json()).toMatchObject({ code: 'invalid_origins' });
  });

  it('updates and deletes', async () => {
    const cookie = await login();
    const { data } = await createSite(cookie);
    const id = data!.site.id;
    const patched = await adminApi(`/sites/${id}`, cookie, {
      method: 'PATCH',
      body: JSON.stringify({ name: '新', origins: ['https://b.com', 'https://c.com/'], retention_days: 90 }),
    });
    expect(patched.status).toBe(200);
    expect(await patched.json()).toMatchObject({ name: '新', origins: ['https://b.com', 'https://c.com'], retention_days: 90 });

    expect((await adminApi(`/sites/${id}`, cookie, { method: 'PATCH', body: JSON.stringify({ origins: [] }) })).status).toBe(400);

    expect((await adminApi(`/sites/${id}`, cookie, { method: 'DELETE' })).status).toBe(200);
    expect((await adminApi(`/sites/${id}`, cookie)).status).toBe(404);
  });

  it('manages tokens', async () => {
    const cookie = await login();
    const { data } = await createSite(cookie);
    const id = data!.site.id;
    const created = await adminApi(`/sites/${id}/tokens`, cookie, { method: 'POST', body: JSON.stringify({ name: '备用' }) });
    expect(created.status).toBe(201);
    const tok = await created.json() as Token;
    const list = await (await adminApi(`/sites/${id}/tokens`, cookie)).json() as Token[];
    expect(list).toHaveLength(2);
    expect((await adminApi(`/sites/${id}/tokens/${tok.id}`, cookie, { method: 'DELETE' })).status).toBe(200);
    expect((await adminApi(`/sites/${id}/tokens/${tok.id}`, cookie, { method: 'DELETE' })).status).toBe(404);
  });

  it('sets counters and lists pages', async () => {
    const cookie = await login();
    const { data } = await createSite(cookie);
    const id = data!.site.id;
    expect((await adminApi(`/sites/${id}/counters`, cookie, { method: 'PUT', body: JSON.stringify({ pv: 12345, uv: 678 }) })).status).toBe(200);
    expect(await (await adminApi(`/sites/${id}`, cookie)).json()).toMatchObject({ pv: 12345, uv: 678 });

    expect((await adminApi(`/sites/${id}/pages/counters`, cookie, { method: 'PUT', body: JSON.stringify({ path: '/posts/a', pv: 99 }) })).status).toBe(200);
    const pages = await (await adminApi(`/sites/${id}/pages?q=posts`, cookie)).json() as Array<{ path: string; pv: number }>;
    expect(pages).toEqual([expect.objectContaining({ path: '/posts/a/', pv: 99 })]);

    expect((await adminApi(`/sites/${id}/counters`, cookie, { method: 'PUT', body: JSON.stringify({ pv: -1 }) })).status).toBe(400);
  });

  it('returns 404 for unknown site', async () => {
    const cookie = await login();
    expect((await adminApi('/sites/nope', cookie)).status).toBe(404);
    expect((await adminApi('/sites/nope/tokens', cookie)).status).toBe(404);
  });
});
