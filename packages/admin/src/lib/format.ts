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
  return new Intl.DateTimeFormat(locale, style === 'long' ? LONG : DATE).format(ms);
}

/** 'YYYY-MM-DD'（UTC 日）→ 图表坐标轴上的短日期，如 9/12 */
export function formatDay(day: string, locale: string, withWeekday = false): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'numeric', day: 'numeric', timeZone: 'UTC', ...(withWeekday ? { weekday: 'short' } : {}),
  }).format(new Date(`${day}T00:00:00Z`));
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
