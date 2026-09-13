import { env } from 'cloudflare:workers';
import { beforeEach } from 'vitest';
import { ensureSchema, resetSchemaCache } from '../src/db/schema';

// 测试运行器可能在每个测试之间回滚存储，而模块级记忆不会回滚，
// 所以每个测试前都清除记忆并重新执行幂等的建表语句。
beforeEach(async () => {
  resetSchemaCache();
  await ensureSchema((env as any).DB as D1Database);
});
