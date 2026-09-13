import { normalizePath, type CountsResponse } from '@catcounter/shared';
import { collectListPaths, endpointFromScript, fetchCounts, fillCounts, sendHit } from './core';

declare global {
  interface Window {
    CatCounter?: { refresh: (path?: string) => Promise<void>; counts: (paths: string[]) => Promise<CountsResponse | null> };
  }
}

(function boot() {
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script) return;
  const token = script.getAttribute('data-token') || '';
  if (!token) return;
  const endpoint = endpointFromScript(script.src);
  if (!endpoint) return;
  const noHit = script.hasAttribute('data-no-hit');
  const forcedPath = script.getAttribute('data-path');

  async function run(pathOverride?: string): Promise<void> {
    const path = normalizePath(pathOverride || forcedPath || location.pathname);
    const listPaths = collectListPaths(document);
    const [hit, counts] = await Promise.all([
      noHit
        ? fetchCounts(endpoint, token, [path]).then((c) => (c ? { site: c.site, page: c.pages[path] || { pv: 0, uv: 0 } } : null))
        : sendHit(endpoint, token, { token, path, title: document.title, referrer: document.referrer }),
      fetchCounts(endpoint, token, listPaths),
    ]);
    fillCounts(document, hit, counts);
  }

  window.CatCounter = {
    refresh: (path?: string) => run(path),
    counts: (paths: string[]) => fetchCounts(endpoint, token, paths),
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => void run());
  } else {
    void run();
  }
})();
