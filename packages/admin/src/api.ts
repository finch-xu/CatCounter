import type {
  ApiErrorBody, ApiErrorCode, Counts, Overview, PageRow, PageStatsList, PageStatsSort, Site, SiteStats, Token,
} from '@catcounter/shared';
import { i18n } from './i18n';

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: ApiErrorCode) {
    super(message);
  }
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

/**
 * 把错误响应转成当前界面语言的提示文字。优先级：
 * 1. 已翻译的 code → 当前语言文案
 * 2. 未翻译的 code 或旧格式响应 → 后端的英文 error（比通用提示更具体）
 * 3. 非 JSON 响应（比如网关返回的 HTML 错误页）→ 带状态码的通用提示
 */
function errorMessage(body: Partial<ApiErrorBody>, status: number): string {
  const { t, te } = i18n.global;
  const key = `errors.${body.code}`;
  if (body.code && te(key)) return t(key, body.params ?? {});
  return body.error || t('errors.requestFailed', { status });
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('content-type', 'application/json');
  const res = await fetch('/admin/api' + path, { ...init, headers, credentials: 'same-origin' });
  if (res.status === 401 && path !== '/login' && path !== '/me') onUnauthorized?.();
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Partial<ApiErrorBody>;
    throw new ApiError(errorMessage(body, res.status), res.status, body.code);
  }
  return (await res.json()) as T;
}

const json = (body: unknown) => JSON.stringify(body);

export const api = {
  login: (password: string) => req<{ ok: true }>('/login', { method: 'POST', body: json({ password }) }),
  logout: () => req<{ ok: true }>('/logout', { method: 'POST' }),
  me: () => req<{ ok: true }>('/me'),
  overview: () => req<Overview>('/overview'),
  sites: () => req<Site[]>('/sites'),
  site: (id: string) => req<Site>(`/sites/${id}`),
  createSite: (body: { name: string; origins: string[] }) =>
    req<{ site: Site; token: Token }>('/sites', { method: 'POST', body: json(body) }),
  updateSite: (id: string, patch: { name?: string; origins?: string[]; retention_days?: number | null }) =>
    req<Site>(`/sites/${id}`, { method: 'PATCH', body: json(patch) }),
  deleteSite: (id: string) => req<{ ok: true }>(`/sites/${id}`, { method: 'DELETE' }),
  stats: (id: string, from: string, to: string) => req<SiteStats>(`/sites/${id}/stats?from=${from}&to=${to}`),
  pages: (id: string, q: string) => req<PageRow[]>(`/sites/${id}/pages?q=${encodeURIComponent(q)}&limit=20`),
  /** 详细数据表格；site 为空字符串表示全部站点 */
  pageStats: (p: {
    site: string; from: string; to: string; q: string; group: string;
    sort: PageStatsSort; dir: 'asc' | 'desc'; limit: number; offset: number;
  }) => {
    const qs = new URLSearchParams({ ...p, limit: String(p.limit), offset: String(p.offset) });
    return req<PageStatsList>(`/page-stats?${qs}`);
  },
  setSiteCounters: (id: string, c: Partial<Counts>) => req<Site>(`/sites/${id}/counters`, { method: 'PUT', body: json(c) }),
  setPageCounters: (id: string, path: string, c: Partial<Counts>) =>
    req<{ ok: true }>(`/sites/${id}/pages/counters`, { method: 'PUT', body: json({ path, ...c }) }),
  tokens: (id: string) => req<Token[]>(`/sites/${id}/tokens`),
  createToken: (id: string, name: string) => req<Token>(`/sites/${id}/tokens`, { method: 'POST', body: json({ name }) }),
  revokeToken: (id: string, tid: string) => req<{ ok: true }>(`/sites/${id}/tokens/${tid}`, { method: 'DELETE' }),
};
