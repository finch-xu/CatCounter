import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  useDeleteSite, useLogout, useOverview, usePageStats, useSite, useUpdateSite, type PageStatsParams,
} from '@/queries';

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
const SITE = { id: 's1', name: 'Blog', origins: [], pv: 0, uv: 0, retention_days: null, created_at: 0 };
const OVERVIEW = { sites: [], totals: { sites: 0, today: { pv: 0, uv: 0 }, all: { pv: 0, uv: 0 } }, series: [] };
const PAGE_STATS = { from: 'a', to: 'b', total: 0, groups: [], rows: [] };
const PARAMS: PageStatsParams = {
  site: '', from: '2026-01-01', to: '2026-01-31', q: '', group: '', sort: 'range_pv', dir: 'desc', limit: 50, offset: 0,
};

/** 记录每次请求，按路径返回固定数据；overrides 可以让某个请求挂起或返回别的内容 */
function stubFetch(overrides: (call: string) => Promise<Response> | undefined = () => undefined) {
  const calls: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const call = `${init?.method ?? 'GET'} ${url.replace('/admin/api', '')}`;
    calls.push(call);
    const custom = overrides(call);
    if (custom) return custom;
    if (url.includes('/overview')) return json(OVERVIEW);
    if (url.includes('/page-stats')) return json(PAGE_STATS);
    if (init?.method === 'DELETE' || url.endsWith('/logout')) return json({ ok: true });
    return json(SITE);
  }));
  return calls;
}

function setup<T>(hook: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rendered = renderHook(hook, {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
  return { client, ...rendered };
}

const settle = () => new Promise((r) => setTimeout(r, 50));
const count = (calls: string[], prefix: string) => calls.filter((c) => c.startsWith(prefix)).length;

describe('站点变更后的缓存处理', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('删除成功后，仍挂载的站点查询不会再去请求已删除的站点', async () => {
    const calls = stubFetch();
    const { result } = setup(() => ({ site: useSite('s1'), remove: useDeleteSite('s1') }));
    await waitFor(() => expect(result.current.site.data?.name).toBe('Blog'));

    await act(() => result.current.remove.mutateAsync());
    await settle();

    expect(count(calls, 'GET /sites/s1')).toBe(1);
    expect(calls).toContain('DELETE /sites/s1');
  });

  it('删除站点后，明细页的数据会重新请求，不会继续显示已删除站点的页面', async () => {
    const calls = stubFetch();
    const { result } = setup(() => ({ pages: usePageStats(PARAMS, true), remove: useDeleteSite('s1') }));
    await waitFor(() => expect(result.current.pages.isSuccess).toBe(true));

    await act(() => result.current.remove.mutateAsync());
    await waitFor(() => expect(count(calls, 'GET /page-stats')).toBe(2));
  });

  it('改名后，明细页的数据会重新请求（站点名是行里的一列）', async () => {
    const calls = stubFetch();
    const { result } = setup(() => ({ pages: usePageStats(PARAMS, true), update: useUpdateSite('s1') }));
    await waitFor(() => expect(result.current.pages.isSuccess).toBe(true));

    await act(() => result.current.update.mutateAsync({ name: 'New name' }));
    await waitFor(() => expect(count(calls, 'GET /page-stats')).toBe(2));
  });

  it('保存不等总览刷新完成：刷新很慢时，变更也立刻算完成', async () => {
    let overviewCalls = 0;
    // 第一次总览请求正常返回，之后的刷新永远挂起
    stubFetch((call) => (call === 'GET /overview' && ++overviewCalls > 1 ? new Promise<Response>(() => undefined) : undefined));
    const { result } = setup(() => ({ overview: useOverview(), update: useUpdateSite('s1') }));
    await waitFor(() => expect(result.current.overview.isSuccess).toBe(true));

    let state = 'still pending';
    await act(async () => {
      void result.current.update.mutateAsync({ name: 'New name' }).then(() => { state = 'resolved'; });
      await settle();
    });
    expect(state).toBe('resolved');
  });
});

describe('退出登录', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('退出后，还挂载着的页面不会再去请求数据（那些请求只会得到 401）', async () => {
    const calls = stubFetch();
    const { result } = setup(() => ({ overview: useOverview(), logout: useLogout() }));
    await waitFor(() => expect(result.current.overview.isSuccess).toBe(true));

    await act(() => result.current.logout.mutateAsync());
    await settle();

    expect(calls).toContain('POST /logout');
    expect(count(calls, 'GET /overview')).toBe(1);
  });
});
