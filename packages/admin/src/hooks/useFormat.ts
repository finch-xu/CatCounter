import { useMemo } from 'react';
import { formatDate, formatDay, formatNumber, formatPercent, regionName, relativeTime } from '@/lib/format';
import { useLocale } from './useLocale';

/** 把 lib/format 绑定到当前界面语言 */
export function useFormat() {
  const { locale } = useLocale();
  return useMemo(() => ({
    n: (v: number) => formatNumber(v, locale),
    pct: (f: number, digits = 1) => formatPercent(f, locale, digits),
    date: (ms: number, style: 'date' | 'long' = 'date') => formatDate(ms, locale, style),
    day: (day: string, withWeekday = false) => formatDay(day, locale, withWeekday),
    rel: (sec: number) => relativeTime(sec, locale),
    region: (code: string) => regionName(code, locale),
  }), [locale]);
}
