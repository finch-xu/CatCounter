import { afterEach, describe, expect, it, vi } from 'vitest';
import { collectListPaths, endpointFromScript, fetchCounts, fillCounts, sendHit } from '../src/core';

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('endpointFromScript', () => {
  it('strips the script filename', () => {
    expect(endpointFromScript('https://c.example.com/catcounter.js')).toBe('https://c.example.com');
    expect(endpointFromScript('https://c.example.com/catcounter.js?v=1')).toBe('https://c.example.com');
  });
});

describe('collectListPaths', () => {
  it('collects unique normalized paths', () => {
    document.body.innerHTML = `
      <li data-cc-path="/posts/a"><span data-cc="page_pv"></span></li>
      <li data-cc-path="/posts/a/"><span data-cc="page_uv"></span></li>
      <li data-cc-path="/posts/b/?x=1"><span data-cc="page_pv"></span></li>`;
    expect(collectListPaths(document)).toEqual(['/posts/a/', '/posts/b/']);
  });
});

describe('fillCounts', () => {
  it('fills page and site placeholders including busuanzi ids', () => {
    document.body.innerHTML = `
      <span data-cc="site_pv">-</span><span data-cc="site_uv">-</span>
      <span data-cc="page_pv">-</span><span data-cc="page_uv">-</span>
      <span id="busuanzi_value_site_pv">-</span><span id="busuanzi_value_page_pv">-</span>`;
    fillCounts(document, { site: { pv: 10, uv: 5 }, page: { pv: 3, uv: 2 } }, null);
    const t = (sel: string) => document.querySelector(sel)!.textContent;
    expect(t('[data-cc="site_pv"]')).toBe('10');
    expect(t('[data-cc="site_uv"]')).toBe('5');
    expect(t('[data-cc="page_pv"]')).toBe('3');
    expect(t('[data-cc="page_uv"]')).toBe('2');
    expect(t('#busuanzi_value_site_pv')).toBe('10');
    expect(t('#busuanzi_value_page_pv')).toBe('3');
  });

  it('fills list items from counts and leaves unknown untouched', () => {
    document.body.innerHTML = `
      <li data-cc-path="/a/"><i data-cc="page_pv">-</i></li>
      <li data-cc-path="/b/"><i data-cc="page_pv">-</i></li>
      <span data-cc="page_pv">-</span>`;
    fillCounts(document, null, { site: { pv: 1, uv: 1 }, pages: { '/a/': { pv: 7, uv: 1 } } });
    const items = document.querySelectorAll('li i');
    expect(items[0].textContent).toBe('7');
    expect(items[1].textContent).toBe('0');
    expect(document.querySelector('span')!.textContent).toBe('-');
  });
});

describe('network', () => {
  it('sendHit posts text/plain json and returns body', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ site: { pv: 1, uv: 1 }, page: { pv: 1, uv: 1 } }), { status: 200 }),
    );
    const r = await sendHit('https://c.test', 'cc_x', { token: 'cc_x', path: '/a/' });
    expect(r?.site.pv).toBe(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://c.test/api/hit');
    expect((init as RequestInit).method).toBe('POST');
    expect(new Headers((init as RequestInit).headers).get('content-type')).toBe('text/plain');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ token: 'cc_x', path: '/a/' });
  });

  it('returns null on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 403 }));
    expect(await sendHit('https://c.test', 'cc_x', { token: 'cc_x', path: '/a/' })).toBeNull();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    expect(await fetchCounts('https://c.test', 'cc_x', ['/a/'])).toBeNull();
  });

  it('fetchCounts builds query and returns null for empty list', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ site: { pv: 1, uv: 1 }, pages: {} }), { status: 200 }),
    );
    expect(await fetchCounts('https://c.test', 'cc_x', [])).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    await fetchCounts('https://c.test', 'cc_x', ['/a/', '/b/']);
    expect(fetchMock.mock.calls[0][0]).toBe('https://c.test/api/counts?token=cc_x&paths=' + encodeURIComponent('/a/,/b/'));
  });
});
