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
  // 即使请求失败也当作已退出。这里只忘掉“已登录”，不清空整个缓存：
  // 外壳此刻还挂载着，清空会让它立刻再发一轮注定 401 的请求。其余缓存由登录页挂载时清掉。
  return useMutation({
    mutationFn: () => api.logout().catch(() => undefined),
    onSettled: () => qc.removeQueries({ queryKey: qk.me }),
  });
}

export function useCreateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; origins: string[] }) => api.createSite(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.overview }),
  });
}

function useSiteWrite<V>(id: string, fn: (v: V) => Promise<Site>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    // 刷新在后台进行，不让“已保存”的反馈等它
    onSuccess: (site) => {
      qc.setQueryData(qk.site(id), site);
      void qc.invalidateQueries({ queryKey: qk.overview });
      // 站点名是明细表里的一列
      void qc.invalidateQueries({ queryKey: ['pageStats'] });
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
    // 这里不移除该站点的查询：站点页此时还挂载着，移除会让它立刻重新请求一个已删除的站点。
    // 缓存由站点页卸载时调用 forgetSite 清理。
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.overview });
      void qc.invalidateQueries({ queryKey: ['pageStats'] });
    },
  });
}

/** 清掉某个站点的全部缓存（站点已删除、页面已离开后调用） */
export function forgetSite(qc: QueryClient, id: string): void {
  for (const scope of ['site', 'stats', 'tokens', 'pages']) qc.removeQueries({ queryKey: [scope, id] });
}

export function useCreateToken(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.createToken(id, name),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.tokens(id) }),
  });
}

export function useRevokeToken(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tid: string) => api.revokeToken(id, tid),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.tokens(id) }),
  });
}

export function useSetPageCounters(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { path: string } & Partial<Counts>) => api.setPageCounters(id, v.path, { pv: v.pv, uv: v.uv }),
    onSuccess: () => {
      for (const scope of [['pages', id], ['pageStats'], ['stats', id]]) void qc.invalidateQueries({ queryKey: scope });
    },
  });
}
