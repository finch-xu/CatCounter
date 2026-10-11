import { describe, expect, it } from 'vitest';
import { safeNext } from '@/lib/safeNext';

describe('safeNext', () => {
  it('站内路径原样返回', () => {
    expect(safeNext('/sites/abc?x=1')).toBe('/sites/abc?x=1');
    expect(safeNext('/details')).toBe('/details');
  });
  it('缺失、站外或畸形的值一律回到 /', () => {
    for (const v of [null, undefined, '', 'details', '//evil.example', 'https://evil.example', '/\\evil.example', '/login']) {
      expect(safeNext(v)).toBe('/');
    }
  });
});
