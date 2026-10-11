export function formatNumber(n: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(n);
}

/** fraction 为 0–1 的比例 */
export function formatPercent(fraction: number, locale: string, digits = 1): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits,
  }).format(fraction);
}

const DATE: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
const LONG: Intl.DateTimeFormatOptions = { ...DATE, hour: '2-digit', minute: '2-digit' };

export function formatDate(ms: number, locale: string, style: 'date' | 'long' = 'date'): string {
  // Intl 遇到非法时间会抛 RangeError；这里宁可显示占位符，也不让整页崩掉
  if (!Number.isFinite(ms)) return '–';
  return new Intl.DateTimeFormat(locale, style === 'long' ? LONG : DATE).format(ms);
}

/** 'YYYY-MM-DD'（UTC 日）→ 图表坐标轴上的短日期，如 9/12 */
export function formatDay(day: string, locale: string, withWeekday = false): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return day;
  return new Intl.DateTimeFormat(locale, {
    month: 'numeric', day: 'numeric', timeZone: 'UTC', ...(withWeekday ? { weekday: 'short' } : {}),
  }).format(date);
}

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 86400],
  ['month', 30 * 86400],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

/** 把 unix 秒转成“3 小时前”“昨天”这类相对时间，不足一分钟显示为“现在” */
export function relativeTime(sec: number, locale: string, nowMs = Date.now()): string {
  const diff = sec - Math.floor(nowMs / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [unit, size] of UNITS) {
    if (Math.abs(diff) >= size) return rtf.format(Math.trunc(diff / size), unit);
  }
  return rtf.format(0, 'second');
}

/** 地区代码 → 本地化名称；代码非法或没有对应名称时原样返回 */
export function regionName(code: string, locale: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return code;
  try {
    return new Intl.DisplayNames(locale, { type: 'region', fallback: 'code' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * 总览页眉上的“今天”。统计里的“今日”按 UTC 日计算，所以显示 UTC 日期；
 * 它和访问者本地的日期不是同一天时（比如东八区早上 8 点前）注明 UTC，免得看起来像显示错了。
 */
export function todayLabel(now: Date, locale: string, timeZone?: string): string {
  const dayKey = (tz?: string) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const utc = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' }).format(now);
  return dayKey(timeZone) === dayKey('UTC') ? utc : `${utc} (UTC)`;
}
