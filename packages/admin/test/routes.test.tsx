import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/api';
import { i18n } from '@/i18n';
import { queryClient } from '@/queries';
import { bindUnauthorized, routerOptions, routes } from '@/routes';
import { json, OVERVIEW, stubApi } from './helpers';

function start(entry: string) {
  const router = createMemoryRouter(routes, { ...routerOptions, initialEntries: [entry] });
  bindUnauthorized(router);
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

/** 已登录时各接口的返回 */
const authed = (c: { path: string }) =>
  c.path === '/overview' ? json(OVERVIEW)
  : c.path.startsWith('/page-stats') ? json({ from: 'a', to: 'b', total: 0, groups: [], rows: [] })
  : undefined;
const loggedOut = () => json({ error: 'x', code: 'unauthorized' }, 401);

describe('登录守卫与会话过期', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    queryClient.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('未登录访问受保护页面时带着原路径跳到登录页', async () => {
    stubApi(loggedOut);
    const router = start('/admin/details?site=x');
    await screen.findByRole('heading', { name: i18n.t('login.title') });
    expect(router.state.location.pathname).toBe('/admin/login');
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent('/details?site=x')}`);
  });

  it('已登录时渲染外壳和页面', async () => {
    stubApi(authed);
    start('/admin/');
    expect(await screen.findByRole('heading', { name: i18n.t('overview.title') })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: i18n.t('sidebar.details') }).length).toBeGreaterThan(0);
  });

  it('未知路径回到总览', async () => {
    stubApi(authed);
    const router = start('/admin/nope/nothing');
    await screen.findByRole('heading', { name: i18n.t('overview.title') });
    expect(router.state.location.pathname).toBe('/admin');
  });

  it('使用中会话过期：任一接口返回 401 就回到登录页', async () => {
    stubApi(authed);
    const router = start('/admin/details');
    await screen.findByRole('heading', { name: i18n.t('details.title') });

    stubApi(loggedOut);
    await api.overview().catch(() => undefined);
    await screen.findByRole('heading', { name: i18n.t('login.title') });
    expect(router.state.location.pathname).toBe('/admin/login');
  });

  it('已经在登录页时，再收到 401 不会重复跳转', async () => {
    stubApi(loggedOut);
    const router = start('/admin/login');
    await screen.findByRole('heading', { name: i18n.t('login.title') });
    const navigate = vi.spyOn(router, 'navigate');
    await api.overview().catch(() => undefined);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('窄屏抽屉：点当前页的导航项也会收起', async () => {
    stubApi(authed);
    start('/admin/');
    await screen.findByRole('heading', { name: i18n.t('overview.title') });
    await userEvent.click(screen.getByRole('button', { name: i18n.t('common.menu') }));
    const drawer = await screen.findByRole('dialog');
    await userEvent.click(within(drawer).getByRole('link', { name: i18n.t('sidebar.overview') }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
