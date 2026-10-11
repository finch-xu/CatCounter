import { describe, expect, it } from 'vitest';
import { isRange, presetDates } from '@/lib/dateRange';

describe('presetDates', () => {
  const now = new Date('2026-10-11T03:00:00Z');
  it('7 天范围含今天，共 7 天', () => {
    expect(presetDates('7', now)).toEqual({ from: '2026-10-05', to: '2026-10-11' });
  });
  it('30 天范围跨月', () => {
    expect(presetDates('30', now)).toEqual({ from: '2026-09-12', to: '2026-10-11' });
  });
  it('按 UTC 取日期，本地时区不影响结果', () => {
    expect(presetDates('7', new Date('2026-10-11T23:59:59Z')).to).toBe('2026-10-11');
  });
});

describe('isRange', () => {
  it('只接受四个合法值', () => {
    expect(['7', '30', '90', 'custom'].every(isRange)).toBe(true);
    expect([undefined, null, '', '14', 7, 'Custom'].some(isRange)).toBe(false);
  });
});
