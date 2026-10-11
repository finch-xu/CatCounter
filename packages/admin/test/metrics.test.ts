import { describe, expect, it } from 'vitest';
import type { DayPoint } from '@catcounter/shared';
import { dailyAverage, peakDay, share, sumSeries, viewsPerVisitor, weekOverWeek, withRatios } from '@/lib/metrics';

const day = (i: number) => `2026-09-${String(12 + i).padStart(2, '0')}`;
const mk = (pv: number[], uv: number[]): DayPoint[] => pv.map((v, i) => ({ day: day(i), pv: v, uv: uv[i] ?? 0 }));

describe('sumSeries / dailyAverage', () => {
  it('求和与四舍五入的日均', () => {
    const s = mk([10, 20, 31], [1, 2, 4]);
    expect(sumSeries(s)).toEqual({ pv: 61, uv: 7 });
    expect(dailyAverage(s)).toEqual({ pv: 20, uv: 2 });
  });
  it('空序列返回 0，不产生 NaN', () => {
    expect(sumSeries([])).toEqual({ pv: 0, uv: 0 });
    expect(dailyAverage([])).toEqual({ pv: 0, uv: 0 });
  });
});

describe('peakDay', () => {
  it('取 PV 最大的一天，并列时取最早的', () => {
    expect(peakDay(mk([5, 9, 9, 3], [1, 1, 1, 1]))?.day).toBe(day(1));
  });
  it('空序列返回 null', () => {
    expect(peakDay([])).toBeNull();
  });
});

describe('weekOverWeek', () => {
  const prev = [1123, 1168, 1201, 942, 876, 821, 858];
  const cur = [903, 967, 1012, 1188, 1236, 1142, 1284];
  it('比较最后 7 天与再往前 7 天', () => {
    const r = weekOverWeek(mk([...prev, ...cur], Array(14).fill(1)));
    expect(r?.current.pv).toBe(7732);
    expect(r?.previous.pv).toBe(6989);
    expect(r?.delta.pv).toBeCloseTo(0.1063, 3);
    expect(r?.delta.uv).toBe(0);
  });
  it('只用最后 14 天，更早的数据不参与', () => {
    const r = weekOverWeek(mk([9999, ...prev, ...cur], Array(15).fill(1)));
    expect(r?.previous.pv).toBe(6989);
  });
  it('不足 14 天返回 null', () => {
    expect(weekOverWeek(mk(Array(13).fill(5), Array(13).fill(1)))).toBeNull();
  });
  it('上期为 0 时环比为 null，而不是 Infinity', () => {
    const r = weekOverWeek(mk([...Array(7).fill(0), ...Array(7).fill(3)], Array(14).fill(0)));
    expect(r?.delta).toEqual({ pv: null, uv: null });
  });
});

describe('share / viewsPerVisitor / withRatios', () => {
  it('总数为 0 时占比为 0', () => {
    expect(share(5, 0)).toBe(0);
    expect(share(1, 4)).toBe(0.25);
  });
  it('UV 为 0 时每访客浏览为 null', () => {
    expect(viewsPerVisitor(mk([3], [0]))).toBeNull();
    expect(viewsPerVisitor(mk([10, 20], [4, 8]))).toBe(2.5);
  });
  it('share 相对总和，ratio 相对最大值', () => {
    const r = withRatios([{ value: 'a', count: 60 }, { value: 'b', count: 30 }, { value: 'c', count: 10 }]);
    expect(r.map((x) => x.share)).toEqual([0.6, 0.3, 0.1]);
    expect(r.map((x) => x.ratio)).toEqual([1, 0.5, 10 / 60]);
  });
  it('空列表与全 0 列表不产生 NaN', () => {
    expect(withRatios([])).toEqual([]);
    expect(withRatios([{ count: 0 }])).toEqual([{ count: 0, share: 0, ratio: 0 }]);
  });
});
