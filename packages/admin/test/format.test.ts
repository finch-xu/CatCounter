import { describe, expect, it } from 'vitest';
import { formatNumber, formatPercent, regionName, relativeTime } from '@/lib/format';

describe('regionName', () => {
  it('合法代码给出本地化名称', () => {
    expect(regionName('US', 'en')).toBe('United States');
    expect(regionName('JP', 'zh-CN')).toBe('日本');
  });
  it('非法或未知代码原样返回，不抛错', () => {
    for (const code of ['', 'T1', 'us', 'USA', '??']) {
      expect(() => regionName(code, 'en')).not.toThrow();
    }
    expect(regionName('', 'en')).toBe('');
    expect(regionName('T1', 'en')).toBe('T1');
  });
});

describe('relativeTime', () => {
  const now = Date.parse('2026-10-11T12:00:00Z');
  const sec = (iso: string) => Math.floor(Date.parse(iso) / 1000);
  it('按最大合适单位表示', () => {
    expect(relativeTime(sec('2026-10-11T09:00:00Z'), 'en', now)).toBe('3 hours ago');
    expect(relativeTime(sec('2026-10-11T11:48:00Z'), 'en', now)).toBe('12 minutes ago');
  });
  it('不足一分钟显示为“现在”', () => {
    expect(relativeTime(sec('2026-10-11T11:59:30Z'), 'en', now)).toBe('now');
  });
});

describe('formatNumber / formatPercent', () => {
  it('千分位与一位小数百分比', () => {
    expect(formatNumber(182634, 'en')).toBe('182,634');
    expect(formatPercent(0.1063, 'en')).toBe('10.6%');
    expect(formatPercent(0, 'en')).toBe('0.0%');
  });
});
