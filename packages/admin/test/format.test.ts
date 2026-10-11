import { describe, expect, it } from 'vitest';
import { formatDate, formatDay, formatNumber, formatPercent, regionName, relativeTime, todayLabel } from '@/lib/format';

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

describe('todayLabel', () => {
  it('本地日期与 UTC 日期相同时只显示日期', () => {
    expect(todayLabel(new Date('2026-10-11T03:00:00Z'), 'en', 'Asia/Shanghai')).toBe('Sunday, October 11, 2026');
  });
  it('两者不同时显示 UTC 日期并注明：统计里的“今日”按 UTC 日计算', () => {
    // 北京时间 10 月 11 日 07:30，此时 UTC 还是 10 月 10 日
    expect(todayLabel(new Date('2026-10-10T23:30:00Z'), 'en', 'Asia/Shanghai')).toBe('Saturday, October 10, 2026 (UTC)');
    // 洛杉矶 10 月 10 日 20:00，UTC 已是 10 月 11 日
    expect(todayLabel(new Date('2026-10-11T03:00:00Z'), 'en', 'America/Los_Angeles')).toBe('Sunday, October 11, 2026 (UTC)');
  });
});

describe('formatDay / formatDate', () => {
  it('正常的日期按语言格式化', () => {
    expect(formatDay('2026-09-12', 'en')).toBe('9/12');
    expect(formatDate(Date.UTC(2026, 9, 11), 'en')).toMatch(/10\/1[01]\/2026/);
  });
  it('不合法的日期不抛错：日原样返回，时间戳显示为短横线', () => {
    expect(formatDay('not-a-date', 'en')).toBe('not-a-date');
    expect(formatDay('', 'en')).toBe('');
    expect(formatDate(Number.NaN, 'en')).toBe('–');
    expect(formatDate(Number.NaN, 'en', 'long')).toBe('–');
  });
});
