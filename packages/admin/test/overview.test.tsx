import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import type { DayPoint, Overview } from '@catcounter/shared';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/i18n';
import OverviewPage from '@/pages/OverviewPage';

const days = (pv: number[], uv: number[]): DayPoint[] =>
  pv.map((v, i) => ({ day: new Date(Date.UTC(2026, 8, 12 + i)).toISOString().slice(0, 10), pv: v, uv: uv[i]! }));

const site = (id: string, name: string, today: [number, number], all: [number, number]) => ({
  id, name, origins: [`https://${id}.example.com`], pv: all[0], uv: all[1],
  retention_days: null, created_at: 1740873600, today: { pv: today[0], uv: today[1] },
});

function renderPage(data: Overview) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
    new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } }),
  ));
  const router = createMemoryRouter(
    [{ path: '/', Component: OverviewPage }, { path: '/sites/:id', element: <p>site page</p> }],
    { initialEntries: ['/'] },
  );
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('总览页', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); });
  afterEach(() => vi.unstubAllGlobals());

  it('渲染指标、环比和站点行', async () => {
    const pv = [...Array(16).fill(1000), 1123, 1168, 1201, 942, 876, 821, 858, 903, 967, 1012, 1188, 1236, 1142, 1284];
    renderPage({
      sites: [site('blog', 'My Blog', [842, 317], [128406, 41952]), site('docs', 'Docs', [442, 206], [36210, 12884])],
      totals: { sites: 2, today: { pv: 1284, uv: 523 }, all: { pv: 164616, uv: 54836 } },
      series: days(pv, pv.map((v) => Math.round(v * 0.4))),
    });
    expect(await screen.findByText('164,616')).toBeInTheDocument();
    expect(screen.getAllByText('1,284').length).toBeGreaterThan(0);
    expect(screen.getAllByText('10.6%').length).toBeGreaterThan(0);
    const row = screen.getByRole('row', { name: /My Blog/ });
    expect(within(row).getByText('128,406')).toBeInTheDocument();
    expect(within(row).getByText('65.6%')).toBeInTheDocument();
  });

  it('全新部署：没有站点、数据全 0 时不出现 NaN 或 Infinity', async () => {
    renderPage({
      sites: [],
      totals: { sites: 0, today: { pv: 0, uv: 0 }, all: { pv: 0, uv: 0 } },
      series: days(Array(30).fill(0), Array(30).fill(0)),
    });
    expect(await screen.findByText(i18n.t('overview.empty'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('overview.noTrafficToday'))).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
  });

  it('接口失败时显示错误状态和重试按钮', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 500 })));
    const router = createMemoryRouter([{ path: '/', Component: OverviewPage }], { initialEntries: ['/'] });
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    expect(await screen.findByRole('button', { name: i18n.t('common.retry') })).toBeInTheDocument();
  });
});
