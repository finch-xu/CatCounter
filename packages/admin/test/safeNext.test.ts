import { describe, expect, it } from 'vitest';
import { safeNext } from '@/lib/safeNext';

describe('safeNext', () => {
  it('站内路径原样返回', () => {
    expect(safeNext('/sites/abc?x=1')).toBe('/sites/abc?x=1');
    expect(safeNext('/details')).toBe('/details');
    expect(safeNext('/login-history')).toBe('/login-history');
  });
  it('缺失、站外或畸形的值一律回到 /', () => {
    for (const v of [
      null, undefined, '', 'details', '//evil.example', 'https://evil.example', '/\\evil.example',
      '/login', '/login/', '/login?next=%2F', '/login#x', '/login/?a=1',
    ]) {
      expect(safeNext(v)).toBe('/');
    }
  });
});
