import { describe, expect, it } from 'vitest';
import { createSite } from '../src/repo/sites';
import { createToken, revokeToken } from '../src/repo/tokens';
import { api, nowSec, testEnv } from './helpers';

const ORIGIN = 'https://blog.example.com';
const UA = 'Mozilla/5.0 (Macintosh) Chrome/120';

async function setup() {
  const site = await createSite(testEnv.DB, { name: 's', origins: [ORIGIN] }, nowSec());
  const token = await createToken(testEnv.DB, site.id, 't', nowSec());
  return { site, token };
}

function hit(body: unknown, headers: Record<string, string> = {}) {
  return api('/api/hit', {
    method: 'POST',
    headers: { 'content-type': 'text/plain', origin: ORIGIN, 'user-agent': UA, 'cf-connecting-ip': '1.1.1.1', ...headers },
    body: JSON.stringify(body),
  });
}

describe('POST /api/hit', () => {
  it('counts and returns numbers with CORS header', async () => {
    const { token } = await setup();
    const res = await hit({ token: token.token, path: '/posts/hello', title: 'Hello', referrer: 'https://www.google.com/' });
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    expect(res.headers.get('vary')).toContain('Origin');
    expect(await res.json()).toEqual({ site: { pv: 1, uv: 1 }, page: { pv: 1, uv: 1 } });

    const again = await hit({ token: token.token, path: '/posts/hello/' });
    expect(await again.json()).toEqual({ site: { pv: 2, uv: 1 }, page: { pv: 2, uv: 1 } });
  });

  it('rejects unknown, revoked token and wrong origin', async () => {
    const { site, token } = await setup();
    expect((await hit({ token: 'cc_nope', path: '/' })).status).toBe(403);
    expect((await hit({ token: token.token, path: '/' }, { origin: 'https://evil.com' })).status).toBe(403);
    await revokeToken(testEnv.DB, site.id, token.id, nowSec());
    expect((await hit({ token: token.token, path: '/' })).status).toBe(403);
  });

  it('rejects malformed body', async () => {
    const res = await api('/api/hit', { method: 'POST', headers: { origin: ORIGIN }, body: '{not json' });
    expect(res.status).toBe(400);
    const res2 = await hit({ path: '/' });
    expect(res2.status).toBe(400);
  });

  it('does not count bots but still returns counts', async () => {
    const { token } = await setup();
    await hit({ token: token.token, path: '/a/' });
    const res = await hit({ token: token.token, path: '/a/' }, { 'user-agent': 'Googlebot/2.1' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ site: { pv: 1, uv: 1 }, page: { pv: 1, uv: 1 } });
  });

  it('different ip is a different visitor', async () => {
    const { token } = await setup();
    await hit({ token: token.token, path: '/a/' });
    const res = await hit({ token: token.token, path: '/a/' }, { 'cf-connecting-ip': '2.2.2.2' });
    expect(await res.json()).toEqual({ site: { pv: 2, uv: 2 }, page: { pv: 2, uv: 2 } });
  });

  it('records referrer host and device', async () => {
    const { site, token } = await setup();
    await hit({ token: token.token, path: '/a/', referrer: 'https://www.google.com/' }, { 'user-agent': 'Mozilla/5.0 (iPhone) Mobile Safari' });
    const dims = await testEnv.DB.prepare('SELECT dim, value FROM daily_dim WHERE site_id = ? ORDER BY dim')
      .bind(site.id).all<{ dim: string; value: string }>();
    const map = Object.fromEntries(dims.results.map((r) => [r.dim, r.value]));
    expect(map.referrer).toBe('google.com');
    expect(map.device).toBe('mobile');
    expect(typeof map.country).toBe('string');
  });
});

describe('GET /api/counts', () => {
  it('returns batch counts without incrementing', async () => {
    const { token } = await setup();
    await hit({ token: token.token, path: '/a/' });
    const url = `/api/counts?token=${token.token}&paths=${encodeURIComponent('/a,/b/')}`;
    const res = await api(url, { headers: { origin: ORIGIN } });
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    expect(await res.json()).toEqual({ site: { pv: 1, uv: 1 }, pages: { '/a/': { pv: 1, uv: 1 }, '/b/': { pv: 0, uv: 0 } } });
    const again = await api(url, { headers: { origin: ORIGIN } });
    expect((await again.json<{ site: { pv: number } }>()).site.pv).toBe(1);
  });

  it('rejects wrong origin and limits paths', async () => {
    const { token } = await setup();
    expect((await api(`/api/counts?token=${token.token}&paths=/a/`, { headers: { origin: 'https://evil.com' } })).status).toBe(403);
    const many = Array.from({ length: 51 }, (_, i) => `/p${i}/`).join(',');
    expect((await api(`/api/counts?token=${token.token}&paths=${encodeURIComponent(many)}`, { headers: { origin: ORIGIN } })).status).toBe(400);
  });
});
