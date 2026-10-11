import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDeleteSite, useSite } from '@/queries';

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

describe('useDeleteSite', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('删除成功后，仍挂载的站点查询不会再去请求已删除的站点', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? 'GET'} ${url}`);
      return json(init?.method === 'DELETE' ? { ok: true } : { id: 's1', name: 'Blog', origins: [], pv: 0, uv: 0, retention_days: null, created_at: 0 });
    }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => ({ site: useSite('s1'), remove: useDeleteSite('s1') }), {
      wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    });
    await waitFor(() => expect(result.current.site.data?.name).toBe('Blog'));

    await act(() => result.current.remove.mutateAsync());
    // 给可能被触发的重新请求留出时间
    await new Promise((r) => setTimeout(r, 50));

    expect(calls.filter((c) => c === 'GET /admin/api/sites/s1')).toHaveLength(1);
    expect(calls).toContain('DELETE /admin/api/sites/s1');
  });
});
