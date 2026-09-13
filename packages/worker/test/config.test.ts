import { describe, expect, it } from 'vitest';
import { missingSecrets } from '../src/lib/config';

// 无法在这里测试 HTTP 层的 503 守卫：测试环境的绑定（wrangler.toml 的 [vars] /
// vitest-pool-workers 配置）里 ADMIN_PASSWORD 与 SESSION_SECRET 始终是已设置的，
// 没有办法在不改动全局测试绑定的前提下模拟"secret 缺失"的请求。因此只对
// missingSecrets 本身做单元测试。
describe('missingSecrets', () => {
  it('returns empty array when both secrets are set', () => {
    expect(missingSecrets({ ADMIN_PASSWORD: 'a', SESSION_SECRET: 'b' })).toEqual([]);
  });

  it('reports a missing ADMIN_PASSWORD', () => {
    expect(missingSecrets({ SESSION_SECRET: 'b' })).toEqual(['ADMIN_PASSWORD']);
  });

  it('reports a missing SESSION_SECRET', () => {
    expect(missingSecrets({ ADMIN_PASSWORD: 'a' })).toEqual(['SESSION_SECRET']);
  });

  it('treats empty string as missing', () => {
    expect(missingSecrets({ ADMIN_PASSWORD: '', SESSION_SECRET: 'b' })).toEqual(['ADMIN_PASSWORD']);
    expect(missingSecrets({ ADMIN_PASSWORD: 'a', SESSION_SECRET: '' })).toEqual(['SESSION_SECRET']);
  });

  it('reports both when neither is set', () => {
    expect(missingSecrets({})).toEqual(['ADMIN_PASSWORD', 'SESSION_SECRET']);
  });
});
