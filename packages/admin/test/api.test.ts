import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, setUnauthorizedHandler } from '@/api';
import { i18n } from '@/i18n';

// 每次调用都新建 Response：响应体只能读取一次
const respond = (status: number, body: unknown, json = true) =>
  vi.fn().mockImplementation(async () => new Response(json ? JSON.stringify(body) : String(body), {
    status, headers: { 'content-type': json ? 'application/json' : 'text/html' },
  }));

describe('api 错误处理', () => {
  const onUnauthorized = vi.fn();
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    onUnauthorized.mockClear();
    setUnauthorizedHandler(onUnauthorized);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('已翻译的错误码用当前语言文案', async () => {
    vi.stubGlobal('fetch', respond(400, { error: 'x', code: 'wrong_password' }));
    await expect(api.login('nope')).rejects.toThrow(i18n.t('errors.wrong_password'));
  });
  it('带参数的错误码会插值', async () => {
    vi.stubGlobal('fetch', respond(400, { error: 'x', code: 'date_range_too_long', params: { max: 366 } }));
    await expect(api.stats('s', 'a', 'b')).rejects.toThrow('366');
  });
  it('未知错误码回退到后端的 error 文本', async () => {
    vi.stubGlobal('fetch', respond(400, { error: 'backend says no', code: 'brand_new_code' }));
    await expect(api.overview()).rejects.toThrow('backend says no');
  });
  it('非 JSON 响应给出带状态码的通用提示', async () => {
    vi.stubGlobal('fetch', respond(502, '<html>bad gateway</html>', false));
    const err = await api.overview().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('Request failed (502)');
    expect(err.status).toBe(502);
  });
  it('普通接口 401 触发未登录回调', async () => {
    vi.stubGlobal('fetch', respond(401, { error: 'x', code: 'unauthorized' }));
    await api.overview().catch(() => undefined);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
  it('/login 与 /me 的 401 不触发回调，避免登录页循环跳转', async () => {
    vi.stubGlobal('fetch', respond(401, { error: 'x', code: 'unauthorized' }));
    await api.me().catch(() => undefined);
    await api.login('x').catch(() => undefined);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
