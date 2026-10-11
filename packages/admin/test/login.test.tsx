import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/i18n';
import LoginPage from '@/pages/LoginPage';

function setup(initial = '/login') {
  const router = createMemoryRouter(
    [
      { path: '/login', Component: LoginPage },
      { path: '/', element: <p>home</p> },
      { path: '/details', element: <p>details page</p> },
    ],
    { initialEntries: [initial] },
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('登录页', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); });
  afterEach(() => vi.unstubAllGlobals());

  it('密码为空时登录按钮禁用', () => {
    setup();
    expect(screen.getByRole('button', { name: i18n.t('login.submit') })).toBeDisabled();
  });

  it('登录成功后跳到 next 指定的站内路径', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, { ok: true })));
    setup('/login?next=%2Fdetails');
    await userEvent.type(screen.getByLabelText(i18n.t('login.password')), 'secret');
    await userEvent.click(screen.getByRole('button', { name: i18n.t('login.submit') }));
    expect(await screen.findByText('details page')).toBeInTheDocument();
  });

  it('next 指向站外时跳到首页', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, { ok: true })));
    setup('/login?next=%2F%2Fevil.example');
    await userEvent.type(screen.getByLabelText(i18n.t('login.password')), 'secret');
    await userEvent.click(screen.getByRole('button', { name: i18n.t('login.submit') }));
    expect(await screen.findByText('home')).toBeInTheDocument();
  });

  it('密码错误时显示错误信息并停留在登录页', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(401, { error: 'x', code: 'wrong_password' })));
    setup();
    await userEvent.type(screen.getByLabelText(i18n.t('login.password')), 'nope');
    await userEvent.click(screen.getByRole('button', { name: i18n.t('login.submit') }));
    expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('errors.wrong_password'));
    expect(screen.getByLabelText(i18n.t('login.password'))).toBeInTheDocument();
  });

  it('显示 / 隐藏密码按钮切换输入框类型', async () => {
    setup();
    const input = screen.getByLabelText(i18n.t('login.password'));
    expect(input).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: i18n.t('login.showPassword') }));
    expect(input).toHaveAttribute('type', 'text');
  });
});
