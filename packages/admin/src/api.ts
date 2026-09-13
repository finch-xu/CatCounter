import type { Counts, Overview, PageRow, Site, SiteStats, Token } from '@catcounter/shared';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('content-type', 'application/json');
  const res = await fetch('/admin/api' + path, { ...init, headers, credentials: 'same-origin' });
  if (res.status === 401 && path !== '/login' && path !== '/me') onUnauthorized?.();
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(body.error || `请求失败（${res.status}）`, res.status);
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
  setSiteCounters: (id: string, c: Partial<Counts>) => req<Site>(`/sites/${id}/counters`, { method: 'PUT', body: json(c) }),
  setPageCounters: (id: string, path: string, c: Partial<Counts>) =>
    req<{ ok: true }>(`/sites/${id}/pages/counters`, { method: 'PUT', body: json({ path, ...c }) }),
  tokens: (id: string) => req<Token[]>(`/sites/${id}/tokens`),
  createToken: (id: string, name: string) => req<Token>(`/sites/${id}/tokens`, { method: 'POST', body: json({ name }) }),
  revokeToken: (id: string, tid: string) => req<{ ok: true }>(`/sites/${id}/tokens/${tid}`, { method: 'DELETE' }),
};
