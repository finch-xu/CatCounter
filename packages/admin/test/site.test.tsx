import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/i18n';
import { presetDates } from '@/lib/dateRange';
import SitePage from '@/pages/SitePage';

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

describe('站点详情页', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); });
  afterEach(() => vi.unstubAllGlobals());

  it('切换到另一个站点时保留已选的时间范围', async () => {
    const statsCalls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/overview')) {
        return json({ sites: [], totals: { sites: 0, today: { pv: 0, uv: 0 }, all: { pv: 0, uv: 0 } }, series: [] });
      }
      if (url.includes('/stats')) {
        statsCalls.push(url);
        const q = new URL(url, 'http://x').searchParams;
        return json({ from: q.get('from'), to: q.get('to'), series: [], pages: [], referrers: [], countries: [], devices: [] });
      }
      const id = url.split('/sites/')[1]!;
      return json({ id, name: `Site ${id}`, origins: [], pv: 0, uv: 0, retention_days: null, created_at: 0 });
    }));
    const router = createMemoryRouter([{ path: '/sites/:id', Component: SitePage }], { initialEntries: ['/sites/a'] });
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    const week = presetDates('7').from;

    await screen.findByRole('heading', { name: 'Site a' });
    await userEvent.click(screen.getByRole('radio', { name: i18n.t('site.days', { n: 7 }) }));
    await waitFor(() => expect(statsCalls.some((c) => c.includes('/sites/a/stats') && c.includes(`from=${week}`))).toBe(true));

    await act(() => router.navigate('/sites/b'));
    await screen.findByRole('heading', { name: 'Site b' });
    await waitFor(() => expect(statsCalls.some((c) => c.includes('/sites/b/stats'))).toBe(true));
    expect(statsCalls.filter((c) => c.includes('/sites/b/stats')).every((c) => c.includes(`from=${week}`))).toBe(true);
    expect(screen.getByRole('radio', { name: i18n.t('site.days', { n: 7 }) })).toBeChecked();
  });

  it('未知的地区代码只显示一遍，不重复成“T1 T1”', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/overview')) {
        return json({ sites: [], totals: { sites: 0, today: { pv: 0, uv: 0 }, all: { pv: 0, uv: 0 } }, series: [] });
      }
      if (url.includes('/stats')) {
        return json({
          from: '2026-09-12', to: '2026-10-11', series: [], pages: [], referrers: [], devices: [],
          countries: [{ value: 'US', count: 9 }, { value: 'T1', count: 3 }],
        });
      }
      return json({ id: 'a', name: 'Site a', origins: [], pv: 0, uv: 0, retention_days: null, created_at: 0 });
    }));
    const router = createMemoryRouter([{ path: '/sites/:id', Component: SitePage }], { initialEntries: ['/sites/a'] });
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('United States')).toBeInTheDocument();
    expect(screen.getAllByText('T1')).toHaveLength(1);
  });

  it('自定义范围的两个日期输入框有各自的标签', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/overview')) {
        return json({ sites: [], totals: { sites: 0, today: { pv: 0, uv: 0 }, all: { pv: 0, uv: 0 } }, series: [] });
      }
      if (url.includes('/stats')) return json({ from: 'a', to: 'b', series: [], pages: [], referrers: [], countries: [], devices: [] });
      return json({ id: 'a', name: 'Site a', origins: [], pv: 0, uv: 0, retention_days: null, created_at: 0 });
    }));
    const router = createMemoryRouter([{ path: '/sites/:id', Component: SitePage }], { initialEntries: ['/sites/a'] });
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    await screen.findByRole('heading', { name: 'Site a' });
    await userEvent.click(screen.getByRole('radio', { name: i18n.t('site.custom') }));
    expect(screen.getByLabelText(i18n.t('site.from'))).toBeInTheDocument();
    expect(screen.getByLabelText(i18n.t('site.until'))).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: i18n.t('site.range') })).toBeInTheDocument();
  });
});
