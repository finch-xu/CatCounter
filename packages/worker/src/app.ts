import { Hono } from 'hono';
import type { Env } from './env';

export const app = new Hono<{ Bindings: Env }>();

app.get('/api/health', (c) => c.json({ ok: true }));

app.get('/', (c) => c.redirect('/admin/'));
app.get('/admin', (c) => c.redirect('/admin/'));

// 后台 SPA 回退：所有非 API 的 /admin/* 路径都返回 admin/index.html
app.get('/admin/*', (c) => {
  const url = new URL('/admin/index.html', c.req.url);
  return c.env.ASSETS.fetch(new Request(url.toString()));
});
