import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createMemoryRouter, type RouteObject } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export interface Call {
  method: string;
  /** 去掉 /admin/api 前缀后的路径（含 query） */
  path: string;
  body?: unknown;
}

/** 拦截 fetch：记录每次调用；handler 返回 undefined 时回 { ok: true } */
export function stubApi(handler: (call: Call) => Response | Promise<Response> | undefined = () => undefined) {
  const calls: Call[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const call: Call = {
      method: init?.method ?? 'GET',
      path: url.replace('/admin/api', ''),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    return (await handler(call)) ?? json({ ok: true });
  }));
  return calls;
}

export const SITE = { id: 's1', name: 'Blog', origins: ['https://blog.example.com'], pv: 10, uv: 5, retention_days: null, created_at: 0 };
export const OVERVIEW = { sites: [], totals: { sites: 0, today: { pv: 0, uv: 0 }, all: { pv: 0, uv: 0 } }, series: [] };

/** 在内存路由 + 查询客户端 + 提示框上下文里渲染一个组件 */
export function renderApp(ui: ReactElement, { route = '/', extraRoutes = [] as RouteObject[] } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '/', element: ui }, ...extraRoutes], { initialEntries: [route] });
  const view = render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>,
  );
  return { client, router, ...view };
}

export const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
