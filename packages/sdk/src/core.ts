import { normalizePath, type CountsResponse, type HitRequest, type HitResponse } from '@catcounter/shared';

export function endpointFromScript(src: string): string {
  const u = new URL(src);
  return u.origin + u.pathname.replace(/\/[^/]*$/, '');
}

export function collectListPaths(root: ParentNode): string[] {
  const out: string[] = [];
  root.querySelectorAll<HTMLElement>('[data-cc-path]').forEach((el) => {
    const p = normalizePath(el.getAttribute('data-cc-path') || '/');
    if (!out.includes(p)) out.push(p);
  });
  return out;
}

const BUSUANZI: Record<string, string> = {
  site_pv: 'busuanzi_value_site_pv',
  site_uv: 'busuanzi_value_site_uv',
  page_pv: 'busuanzi_value_page_pv',
  page_uv: 'busuanzi_value_page_uv',
};

function setText(el: Element | null, v: number | undefined): void {
  if (el && typeof v === 'number') el.textContent = String(v);
}

/** 用 hit 结果填当前页占位，用 counts 结果填列表项占位。为 null 的部分跳过。 */
export function fillCounts(root: ParentNode, hit: HitResponse | null, counts: CountsResponse | null): void {
  if (hit) {
    const values: Record<string, number> = {
      site_pv: hit.site.pv, site_uv: hit.site.uv, page_pv: hit.page.pv, page_uv: hit.page.uv,
    };
    for (const key of Object.keys(values)) {
      root.querySelectorAll(`[data-cc="${key}"]`).forEach((el) => {
        if (!el.closest('[data-cc-path]')) setText(el, values[key]);
      });
      setText((root as Document).getElementById?.(BUSUANZI[key]) ?? null, values[key]);
    }
  }
  if (counts) {
    root.querySelectorAll<HTMLElement>('[data-cc-path]').forEach((item) => {
      const p = normalizePath(item.getAttribute('data-cc-path') || '/');
      const c = counts.pages[p] || { pv: 0, uv: 0 };
      item.querySelectorAll('[data-cc="page_pv"]').forEach((el) => setText(el, c.pv));
      item.querySelectorAll('[data-cc="page_uv"]').forEach((el) => setText(el, c.uv));
    });
  }
}

export async function sendHit(endpoint: string, token: string, body: HitRequest): Promise<HitResponse | null> {
  try {
    const res = await fetch(endpoint + '/api/hit', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({ ...body, token }),
      keepalive: true,
    });
    if (!res.ok) return null;
    return (await res.json()) as HitResponse;
  } catch {
    return null;
  }
}

export async function fetchCounts(endpoint: string, token: string, paths: string[]): Promise<CountsResponse | null> {
  if (paths.length === 0) return null;
  try {
    const url = `${endpoint}/api/counts?token=${encodeURIComponent(token)}&paths=${encodeURIComponent(paths.join(','))}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as CountsResponse;
  } catch {
    return null;
  }
}
