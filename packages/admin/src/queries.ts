import { keepPreviousData, QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Counts, PageStatsSort, Site } from '@catcounter/shared';
import { api, ApiError } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // 4xx 是请求本身的问题，重试没有意义
      retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 1,
    },
  },
});

export interface PageStatsParams {
  site: string; from: string; to: string; q: string; group: string;
  sort: PageStatsSort; dir: 'asc' | 'desc'; limit: number; offset: number;
}

export const qk = {
  me: ['me'] as const,
  overview: ['overview'] as const,
  site: (id: string) => ['site', id] as const,
  stats: (id: string, from: string, to: string) => ['stats', id, from, to] as const,
  pageStats: (p: PageStatsParams) => ['pageStats', p] as const,
  tokens: (id: string) => ['tokens', id] as const,
  pages: (id: string, q: string) => ['pages', id, q] as const,
};

export const useOverview = () => useQuery({ queryKey: qk.overview, queryFn: api.overview });
export const useSite = (id: string) => useQuery({ queryKey: qk.site(id), queryFn: () => api.site(id) });
export const useSiteStats = (id: string, from: string, to: string) =>
  useQuery({
    queryKey: qk.stats(id, from, to),
    queryFn: () => api.stats(id, from, to),
    enabled: Boolean(from && to),
    placeholderData: keepPreviousData,
  });
export const usePageStats = (p: PageStatsParams, enabled: boolean) =>
  useQuery({ queryKey: qk.pageStats(p), queryFn: () => api.pageStats(p), enabled, placeholderData: keepPreviousData });
export const useTokens = (id: string, enabled: boolean) =>
  useQuery({ queryKey: qk.tokens(id), queryFn: () => api.tokens(id), enabled });
export const usePageSearch = (id: string, q: string, enabled: boolean) =>
  useQuery({ queryKey: qk.pages(id, q), queryFn: () => api.pages(id, q), enabled });

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => api.login(password),
    onSuccess: () => qc.setQueryData(qk.me, { ok: true }),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  // 即使请求失败也清理本地状态
  return useMutation({ mutationFn: () => api.logout().catch(() => undefined), onSettled: () => qc.clear() });
}

export function useCreateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; origins: string[] }) => api.createSite(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.overview }),
  });
}

function useSiteWrite<V>(id: string, fn: (v: V) => Promise<Site>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (site) => {
      qc.setQueryData(qk.site(id), site);
      return qc.invalidateQueries({ queryKey: qk.overview });
    },
  });
}

export const useUpdateSite = (id: string) =>
  useSiteWrite(id, (patch: { name?: string; origins?: string[]; retention_days?: number | null }) => api.updateSite(id, patch));
export const useSetSiteCounters = (id: string) => useSiteWrite(id, (c: Partial<Counts>) => api.setSiteCounters(id, c));

export function useDeleteSite(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteSite(id),
    onSuccess: () => {
      qc.removeQueries({ queryKey: qk.site(id) });
      return qc.invalidateQueries({ queryKey: qk.overview });
    },
  });
}

export function useCreateToken(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.createToken(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.tokens(id) }),
  });
}

export function useRevokeToken(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tid: string) => api.revokeToken(id, tid),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.tokens(id) }),
  });
}

export function useSetPageCounters(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { path: string } & Partial<Counts>) => api.setPageCounters(id, v.path, { pv: v.pv, uv: v.uv }),
    onSuccess: () => Promise.all([
      qc.invalidateQueries({ queryKey: ['pages', id] }),
      qc.invalidateQueries({ queryKey: ['pageStats'] }),
      qc.invalidateQueries({ queryKey: ['stats', id] }),
    ]),
  });
}
