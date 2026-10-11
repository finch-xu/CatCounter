import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/i18n';
import DetailsPage from '@/pages/DetailsPage';
import { json, OVERVIEW, pause, renderApp, stubApi } from './helpers';

interface Options {
  total?: number;
  groups?: Array<{ prefix: string; count: number }>;
  /** 让明细接口一直不返回，用来看加载中的界面 */
  hang?: boolean;
}

function renderPage(route: string, { total = 0, groups = [], hang = false }: Options = {}) {
  const calls = stubApi((c) => {
    if (c.path === '/overview') return json(OVERVIEW);
    if (hang) return new Promise<Response>(() => undefined);
    return json({ from: 'a', to: 'b', total, groups, rows: [] });
  });
  const view = renderApp(<p>home</p>, { route, extraRoutes: [{ path: '/details', Component: DetailsPage }] });
  return { ...view, calls, pageStatsCalls: () => calls.filter((c) => c.path.startsWith('/page-stats')) };
}

const search = () => screen.findByLabelText(i18n.t('details.searchPlaceholder'));

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
    fireEvent.change(await search(), { target: { value: 'hello' } });
    expect(router.state.location.search).not.toContain('q=');
    await waitFor(() => expect(router.state.location.search).toContain('q=hello'));
    await waitFor(() => expect(pageStatsCalls().some((c) => c.path.includes('q=hello'))).toBe(true));
  });

  it('输入法组字期间不搜索：拼音字母不会被当成搜索词写进地址栏', async () => {
    const { router } = renderPage('/details');
    const input = await search();

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: 'ni' } });
    await pause(400);
    expect(router.state.location.search).not.toContain('q=');
    expect(input).toHaveValue('ni');

    fireEvent.change(input, { target: { value: '你' } });
    fireEvent.compositionEnd(input);
    await waitFor(() => expect(router.state.location.search).toContain(`q=${encodeURIComponent('你')}`));
  });

  it('防抖期间筛选条件被改掉（比如点了侧栏的“详细数据”），到点后以最新的条件为准', async () => {
    const { router } = renderPage('/details?site=s1');
    fireEvent.change(await search(), { target: { value: 'abc' } });
    await act(() => router.navigate('/details'));
    await waitFor(() => expect(router.state.location.search).toContain('q=abc'));
    expect(router.state.location.search).not.toContain('site=');
  });

  it('页码超出范围时回到最后一页，而不是显示一段不存在的条目', async () => {
    const { router } = renderPage('/details?page=999', { total: 60 });
    await waitFor(() => expect(router.state.location.search).toContain('page=2'));
    expect(document.body.textContent).not.toMatch(/49,9\d\d/);
  });

  it('分组一行从一开始就在：数据还没回来时已有“全部”，不会事后把表格顶下去', async () => {
    renderPage('/details', { hang: true });
    await search();
    const groups = screen.getByRole('group', { name: i18n.t('details.group') });
    expect(within(groups).getByRole('button', { name: i18n.t('details.groupAll') })).toHaveAttribute('aria-pressed', 'true');
  });

  it('分组按数量取前 8 个做成胶囊，其余收进“更多”', async () => {
    const groups = Array.from({ length: 10 }, (_, i) => ({ prefix: `/g${i}/`, count: 100 - i }));
    renderPage('/details', { total: 500, groups });
    const row = screen.getByRole('group', { name: i18n.t('details.group') });
    await within(row).findByRole('button', { name: /\/g0\// });
    expect(within(row).getAllByRole('button', { pressed: false })).toHaveLength(8);
    expect(within(row).queryByRole('button', { name: /\/g9\// })).not.toBeInTheDocument();
    expect(within(row).getByRole('combobox', { name: i18n.t('common.more') })).toBeInTheDocument();
  });

  it('日期输入框和范围控件有说得清用途的标签', async () => {
    renderPage('/details?range=custom&from=2026-01-01&to=2026-01-31');
    expect(await screen.findByLabelText(i18n.t('site.from'))).toHaveValue('2026-01-01');
    expect(screen.getByLabelText(i18n.t('site.until'))).toHaveValue('2026-01-31');
    expect(screen.getByRole('radiogroup', { name: i18n.t('site.range') })).toBeInTheDocument();
  });
});
