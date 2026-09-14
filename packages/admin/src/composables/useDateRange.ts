import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

export type Range = '7' | '30' | '90' | 'custom';

export function isRange(v: unknown): v is Range {
  return v === '7' || v === '30' || v === '90' || v === 'custom';
}

/** 预设范围对应的日期（UTC，与后端 dayOf 一致），截止到今天 */
export function presetDates(range: Exclude<Range, 'custom'>): { from: string; to: string } {
  const today = new Date();
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (Number(range) - 1));
  return { from: start.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
}

export function useRangeOptions() {
  const { t } = useI18n();
  return computed(() => [
    { label: t('site.days', { n: 7 }), value: '7' as const },
    { label: t('site.days', { n: 30 }), value: '30' as const },
    { label: t('site.days', { n: 90 }), value: '90' as const },
    { label: t('site.custom'), value: 'custom' as const },
  ]);
}
