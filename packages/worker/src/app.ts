import { Hono } from 'hono';
import { ensureSchema } from './db/schema';
import type { Env } from './env';
import { missingSecrets } from './lib/config';
import { apiError } from './lib/errors';
import { adminRoutes } from './routes/admin';
import { publicRoutes } from './routes/public';

export const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', async (c, next) => {
  const names = missingSecrets(c.env);
  if (names.length > 0) {
    return c.json(apiError('not_configured', { names: names.join(', ') }), 503);
  }
  await next();
});
app.use('/admin/api/*', async (c, next) => {
  const names = missingSecrets(c.env);
  if (names.length > 0) {
    return c.json(apiError('not_configured', { names: names.join(', ') }), 503);
  }
  await next();
});

app.use('*', async (c, next) => {
  await ensureSchema(c.env.DB);
  await next();
});

app.get('/api/health', (c) => c.json({ ok: true }));

app.route('/api', publicRoutes);

app.route('/admin/api', adminRoutes);

app.get('/', (c) => c.redirect('/admin/'));
app.get('/admin', (c) => c.redirect('/admin/'));

// 后台 SPA 回退：所有非 API 的 /admin/* 路径都返回 admin/index.html
app.get('/admin/*', (c) => {
  const url = new URL('/admin/index.html', c.req.url);
  return c.env.ASSETS.fetch(new Request(url.toString()));
});

app.onError((err, c) => {
  console.error(err);
  return c.json(apiError('internal_error'), 500);
});
