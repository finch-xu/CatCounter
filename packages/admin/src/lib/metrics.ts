import type { DayPoint } from '@catcounter/shared';

export interface Totals { pv: number; uv: number }

export function sumSeries(series: readonly DayPoint[]): Totals {
  return series.reduce<Totals>((a, p) => ({ pv: a.pv + p.pv, uv: a.uv + p.uv }), { pv: 0, uv: 0 });
}

export function dailyAverage(series: readonly DayPoint[]): Totals {
  if (series.length === 0) return { pv: 0, uv: 0 };
  const t = sumSeries(series);
  return { pv: Math.round(t.pv / series.length), uv: Math.round(t.uv / series.length) };
}

/** PV 最大的一天；并列时取最早的 */
export function peakDay(series: readonly DayPoint[]): DayPoint | null {
  let best: DayPoint | null = null;
  for (const p of series) if (!best || p.pv > best.pv) best = p;
  return best;
}

/** total 不为正时返回 0，避免除零 */
export function share(part: number, total: number): number {
  return total > 0 ? part / total : 0;
}

export interface WeekCompare {
  current: Totals;
  previous: Totals;
  /** 相对变化（0.1 表示 +10%）；上期为 0 时无法比较，为 null */
  delta: { pv: number | null; uv: number | null };
}

const change = (cur: number, prev: number) => (prev > 0 ? (cur - prev) / prev : null);

/** 最后 7 天对比再往前 7 天；不足 14 天返回 null */
export function weekOverWeek(series: readonly DayPoint[]): WeekCompare | null {
  if (series.length < 14) return null;
  const current = sumSeries(series.slice(-7));
  const previous = sumSeries(series.slice(-14, -7));
  return { current, previous, delta: { pv: change(current.pv, previous.pv), uv: change(current.uv, previous.uv) } };
}

/** ΣPV ÷ Σ每日 UV；没有访客时为 null */
export function viewsPerVisitor(series: readonly DayPoint[]): number | null {
  const t = sumSeries(series);
  return t.uv > 0 ? t.pv / t.uv : null;
}

/** share：占总和的比例；ratio：相对最大值的比例（用于条形长度） */
export function withRatios<T extends { count: number }>(items: readonly T[]): Array<T & { share: number; ratio: number }> {
  const total = items.reduce((a, i) => a + i.count, 0);
  const max = items.reduce((a, i) => Math.max(a, i.count), 0);
  return items.map((i) => ({ ...i, share: share(i.count, total), ratio: share(i.count, max) }));
}
