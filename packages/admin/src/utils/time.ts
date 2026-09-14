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
