import { render, screen } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RouteError } from '@/components/RouteError';
import { i18n } from '@/i18n';
import { stripBase } from '@/lib/basePath';

function Boom(): never {
  throw new Error('chunk failed to load');
}

describe('路由错误边界', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('页面渲染抛错时显示已翻译的提示和重新加载按钮，而不是框架默认的报错页', async () => {
    const router = createMemoryRouter([{ path: '/', Component: Boom, ErrorBoundary: RouteError }], { initialEntries: ['/'] });
    render(<RouterProvider router={router} />);
    expect(await screen.findByText(i18n.t('common.unexpectedError'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: i18n.t('common.reload') })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Unexpected Application Error/);
  });
});

describe('stripBase', () => {
  it('去掉 /admin 前缀', () => {
    expect(stripBase('/admin/login')).toBe('/login');
    expect(stripBase('/admin')).toBe('/');
    expect(stripBase('/admin/')).toBe('/');
    expect(stripBase('/admin/sites/a')).toBe('/sites/a');
  });
  it('没有前缀或只是同名前缀的路径原样返回', () => {
    expect(stripBase('/login')).toBe('/login');
    expect(stripBase('/administrator')).toBe('/administrator');
  });
  it('数据路由的 state.location 带着 basename，所以比较路径前必须先去掉它', () => {
    const router = createMemoryRouter([{ path: '/login', element: null }], { basename: '/admin', initialEntries: ['/admin/login'] });
    expect(stripBase(router.state.location.pathname)).toBe('/login');
  });
});
