import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalSettingsDialog } from '@/dialogs/GlobalSettingsDialog';
import { NewSiteDialog } from '@/dialogs/NewSiteDialog';
import { SiteSettingsDialog } from '@/dialogs/SiteSettingsDialog';
import { setTheme } from '@/hooks/useTheme';
import { i18n } from '@/i18n';
import { json, renderApp, SITE, stubApi } from './helpers';

const TOKEN = { id: 't1', site_id: 's1', token: 'cc_abc', name: 'default', created_at: 0, revoked_at: null, last_used_at: null };

/** 带一个开关按钮的宿主，用来测“关掉再打开” */
function Toggle({ children }: { children: (open: boolean, setOpen: (o: boolean) => void) => React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen((o) => !o)}>toggle</button>
      {children(open, setOpen)}
    </>
  );
}
const reopen = async () => {
  // 弹窗打开时页面其余部分对读屏不可见，按钮要带 hidden 才查得到
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await userEvent.click(screen.getByRole('button', { name: 'toggle' }));
  return screen.findByRole('dialog');
};

beforeEach(async () => { await i18n.changeLanguage('en'); });
afterEach(() => {
  vi.unstubAllGlobals();
  setTheme('system');
});

describe('新建站点弹窗', () => {
  const open = () => renderApp(<Toggle>{(o, set) => <NewSiteDialog open={o} onOpenChange={set} />}</Toggle>);

  it('两项都填了才能创建；创建时按行拆分 Origin 并去掉空行', async () => {
    const calls = stubApi((c) => (c.method === 'POST' ? json({ site: { ...SITE, name: 'My Blog' }, token: TOKEN }) : undefined));
    open();
    const create = screen.getByRole('button', { name: 'Create' });
    expect(create).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Site name'), ' My Blog ');
    expect(create).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Allowed origins/), 'https://a.example.com\n\n  http://localhost:4000  ');
    await userEvent.click(create);
    await waitFor(() => expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      name: 'My Blog', origins: ['https://a.example.com', 'http://localhost:4000'],
    }));
  });

  it('创建成功后显示加粗的站点名和带 token 的接入代码', async () => {
    stubApi((c) => (c.method === 'POST' ? json({ site: { ...SITE, name: 'My Blog' }, token: TOKEN }) : undefined));
    open();
    await userEvent.type(screen.getByLabelText('Site name'), 'My Blog');
    await userEvent.type(screen.getByLabelText(/Allowed origins/), 'https://a.example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    const name = await screen.findByText('My Blog');
    expect(name.tagName).toBe('B');
    expect(screen.getByText(/data-token="cc_abc"/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('创建失败时在表单里显示后端的错误信息', async () => {
    stubApi((c) => (c.method === 'POST' ? json({ error: 'x', code: 'invalid_origins' }, 400) : undefined));
    open();
    await userEvent.type(screen.getByLabelText('Site name'), 'My Blog');
    await userEvent.type(screen.getByLabelText(/Allowed origins/), 'nope');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('errors.invalid_origins'));
  });

  it('关掉再打开是一张空表单，不残留上次的输入或“已创建”结果', async () => {
    stubApi((c) => (c.method === 'POST' ? json({ site: SITE, token: TOKEN }) : undefined));
    open();
    await userEvent.type(screen.getByLabelText('Site name'), 'My Blog');
    await userEvent.type(screen.getByLabelText(/Allowed origins/), 'https://a.example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await screen.findByRole('button', { name: 'Done' });
    await reopen();
    expect(screen.getByLabelText('Site name')).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
  });
});

describe('站点设置弹窗', () => {
  function open(onDelete = vi.fn()) {
    renderApp(
      <Toggle>
        {(o, set) => <SiteSettingsDialog site={SITE} open={o} onOpenChange={set} onDelete={onDelete} deleting={false} />}
      </Toggle>,
    );
    return onDelete;
  }
  const tab = (name: string) => screen.getByRole('tab', { name });
  const pageSearches = (calls: ReturnType<typeof stubApi>) => calls.filter((c) => c.path.startsWith('/sites/s1/pages?'));

  it('关掉再打开回到第一个分页，没保存的改动被丢弃', async () => {
    stubApi((c) => (c.path.endsWith('/tokens') ? json([TOKEN]) : undefined));
    open();
    await userEvent.type(screen.getByLabelText('Site name'), ' edited');
    await userEvent.click(tab('Tokens'));
    await reopen();
    expect(tab('General')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Site name')).toHaveValue('Blog');
  });

  it('吊销 token 要先确认：点“吊销”只弹确认框，确认后才发请求', async () => {
    const calls = stubApi((c) => (c.path.endsWith('/tokens') ? json([TOKEN]) : undefined));
    open();
    await userEvent.click(tab('Tokens'));
    await userEvent.click(await screen.findByRole('button', { name: 'Revoke' }));
    const confirm = await screen.findByRole('alertdialog');
    expect(confirm).toHaveTextContent('default');
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
    await userEvent.click(within(confirm).getByRole('button', { name: 'Revoke' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'DELETE', path: '/sites/s1/tokens/t1', body: undefined }));
  });

  it('删除站点要先原样键入站点名', async () => {
    stubApi((c) => (c.path.endsWith('/tokens') ? json([]) : undefined));
    const onDelete = open();
    await userEvent.click(tab('Danger zone'));
    const button = screen.getByRole('button', { name: 'Delete site' });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/to confirm/), 'blog');
    expect(button).toBeDisabled();
    await userEvent.clear(screen.getByLabelText(/to confirm/));
    await userEvent.type(screen.getByLabelText(/to confirm/), 'Blog');
    await userEvent.click(button);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('计数修正：用同一个关键词再点一次搜索会重新请求', async () => {
    const calls = stubApi((c) => (c.path.includes('/pages?') ? json([]) : c.path.endsWith('/tokens') ? json([]) : undefined));
    open();
    await userEvent.click(tab('Adjust counts'));
    await userEvent.type(screen.getByRole('searchbox'), '/posts');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(pageSearches(calls)).toHaveLength(1));
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(pageSearches(calls)).toHaveLength(2));
  });

  it('站点计数两项都留空时提示至少填一项，不发请求', async () => {
    const calls = stubApi((c) => (c.path.endsWith('/tokens') ? json([]) : undefined));
    open();
    await userEvent.click(tab('Adjust counts'));
    const panel = screen.getByRole('tabpanel', { name: 'Adjust counts' });
    const [pv, uv] = within(panel).getAllByRole('spinbutton') as [HTMLElement, HTMLElement];
    await userEvent.clear(pv);
    await userEvent.clear(uv);
    await userEvent.click(within(panel).getAllByRole('button', { name: 'Update' })[0]!);
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);
  });
});

describe('全局设置弹窗', () => {
  const open = () => renderApp(
    <GlobalSettingsDialog open onOpenChange={() => undefined} />,
    { extraRoutes: [{ path: '/login', element: <p>login page</p> }] },
  );

  it('切换主题立即生效并写入本地存储', async () => {
    stubApi();
    open();
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('cc-theme')).toBe('dark');
    await userEvent.click(screen.getByRole('radio', { name: 'System' }));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('切换语言后界面文案跟着变', async () => {
    stubApi();
    open();
    await userEvent.click(screen.getByRole('radio', { name: '简体中文' }));
    expect(await screen.findByRole('tab', { name: '外观' })).toBeInTheDocument();
    expect(localStorage.getItem('cc-lang')).toBe('zh-CN');
  });

  it('账户分页用代码样式标出环境变量名；退出登录后回到登录页', async () => {
    const calls = stubApi();
    open();
    await userEvent.click(screen.getByRole('tab', { name: 'Account' }));
    expect(screen.getByText('ADMIN_PASSWORD').tagName).toBe('CODE');
    await userEvent.click(screen.getByRole('button', { name: i18n.t('settings.logout') }));
    expect(await screen.findByText('login page')).toBeInTheDocument();
    expect(calls).toContainEqual({ method: 'POST', path: '/logout', body: undefined });
  });

  it('关于分页显示版本号和源码链接', async () => {
    stubApi();
    open();
    await userEvent.click(screen.getByRole('tab', { name: 'About' }));
    expect(screen.getByText(/0\.0\.0-test/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'github.com/finch-xu/CatCounter' })).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
