import { app } from './app';
import { runCleanup } from './cron';
import { ensureSchema } from './db/schema';
import type { Env } from './env';
import { dayOf } from './lib/hash';

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => app.fetch(request, env, ctx),
  scheduled: async (_controller: ScheduledController, env: Env, ctx: ExecutionContext) => {
    await ensureSchema(env.DB);
    ctx.waitUntil(runCleanup(env.DB, dayOf(Math.floor(Date.now() / 1000))));
  },
} satisfies ExportedHandler<Env>;
