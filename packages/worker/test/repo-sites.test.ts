import { describe, expect, it } from 'vitest';
import {
  createSite, deleteSite, getSite, listPages, listSites, setPageCounters, setSiteCounters, updateSite,
} from '../src/repo/sites';
import { createToken, findActiveToken, generateToken, listTokens, revokeToken } from '../src/repo/tokens';
import { nowSec, testEnv } from './helpers';

const db = () => testEnv.DB;

describe('sites repo', () => {
  it('creates, reads, updates and deletes a site', async () => {
    const site = await createSite(db(), { name: '我的博客', origins: ['https://blog.example.com'] }, nowSec());
    expect(site.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(site.pv).toBe(0);
    expect(site.origins).toEqual(['https://blog.example.com']);

    expect((await listSites(db())).some((s) => s.id === site.id)).toBe(true);
    expect(await getSite(db(), site.id)).toEqual(site);

    const updated = await updateSite(db(), site.id, { name: '新名字', retention_days: 30 });
    expect(updated?.name).toBe('新名字');
    expect(updated?.retention_days).toBe(30);
    expect(updated?.origins).toEqual(['https://blog.example.com']);

    await deleteSite(db(), site.id);
    expect(await getSite(db(), site.id)).toBeNull();
  });

  it('sets counters manually', async () => {
    const site = await createSite(db(), { name: 's', origins: ['https://a.com'] }, nowSec());
    await setSiteCounters(db(), site.id, { pv: 1000 });
    expect((await getSite(db(), site.id))?.pv).toBe(1000);
    expect((await getSite(db(), site.id))?.uv).toBe(0);

    await setPageCounters(db(), site.id, '/p/', { pv: 5, uv: 2 }, nowSec());
    await setPageCounters(db(), site.id, '/p/', { uv: 3 }, nowSec());
    const pages = await listPages(db(), site.id, '', 10, 0);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({ path: '/p/', pv: 5, uv: 3 });

    expect(await listPages(db(), site.id, 'zzz', 10, 0)).toHaveLength(0);
    expect(await listPages(db(), site.id, '/p', 10, 0)).toHaveLength(1);
  });
});

describe('tokens repo', () => {
  it('generates well-formed tokens', () => {
    const t = generateToken();
    expect(t).toMatch(/^cc_[0-9A-Za-z]{24}$/);
    expect(generateToken()).not.toBe(t);
  });

  it('creates, finds, lists and revokes', async () => {
    const site = await createSite(db(), { name: 's', origins: ['https://a.com'] }, nowSec());
    const tok = await createToken(db(), site.id, '默认', nowSec());
    expect(tok.site_id).toBe(site.id);

    const found = await findActiveToken(db(), tok.token);
    expect(found?.site.id).toBe(site.id);
    expect(found?.token.id).toBe(tok.id);
    expect(await findActiveToken(db(), 'cc_nope')).toBeNull();

    expect(await listTokens(db(), site.id)).toHaveLength(1);
    expect(await revokeToken(db(), site.id, tok.id, nowSec())).toBe(true);
    expect(await revokeToken(db(), site.id, tok.id, nowSec())).toBe(false);
    expect(await findActiveToken(db(), tok.token)).toBeNull();
    expect((await listTokens(db(), site.id))[0].revoked_at).not.toBeNull();
  });

  it('deleting a site removes its tokens', async () => {
    const site = await createSite(db(), { name: 's', origins: ['https://a.com'] }, nowSec());
    const tok = await createToken(db(), site.id, 't', nowSec());
    await deleteSite(db(), site.id);
    expect(await findActiveToken(db(), tok.token)).toBeNull();
    expect(await listTokens(db(), site.id)).toHaveLength(0);
  });
});
