import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { i18n } from '@/i18n';
import DetailsPage from '@/pages/DetailsPage';

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

function renderPage(initial: string) {
  const calls: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    calls.push(url);
    if (url.includes('/overview')) {
      return json({ sites: [], totals: { sites: 0, today: { pv: 0, uv: 0 }, all: { pv: 0, uv: 0 } }, series: [] });
    }
    return json({ from: 'a', to: 'b', total: 0, groups: [], rows: [] });
  }));
  const router = createMemoryRouter([{ path: '/details', Component: DetailsPage }], { initialEntries: [initial] });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>,
  );
  return { router, calls, pageStatsCalls: () => calls.filter((c) => c.includes('/page-stats')) };
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('详细数据页', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); });
  afterEach(() => vi.unstubAllGlobals());

  it('自定义范围但地址栏里没有日期时不发请求', async () => {
    const { pageStatsCalls } = renderPage('/details?range=custom');
    await screen.findByText(i18n.t('common.noData'));
    await pause(50);
    expect(pageStatsCalls()).toHaveLength(0);
  });

  it('输入搜索词 300ms 后写入地址栏并按它查询', async () => {
    const { router, pageStatsCalls } = renderPage('/details');
    const input = await screen.findByLabelText(i18n.t('details.searchPlaceholder'));
    fireEvent.change(input, { target: { value: 'hello' } });
    expect(router.state.location.search).not.toContain('q=');
    await waitFor(() => expect(router.state.location.search).toContain('q=hello'));
    await waitFor(() => expect(pageStatsCalls().some((c) => c.includes('q=hello'))).toBe(true));
  });

  it('输入法组字期间不搜索：拼音字母不会被当成搜索词写进地址栏', async () => {
    const { router } = renderPage('/details');
    const input = await screen.findByLabelText(i18n.t('details.searchPlaceholder'));

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: 'ni' } });
    await pause(400);
    expect(router.state.location.search).not.toContain('q=');
    expect(input).toHaveValue('ni');

    fireEvent.change(input, { target: { value: '你' } });
    fireEvent.compositionEnd(input);
    await waitFor(() => expect(router.state.location.search).toContain(`q=${encodeURIComponent('你')}`));
  });
});
