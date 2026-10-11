import { Calendar } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PRESET_RANGES, type Range } from '@/lib/dateRange';
import { Segmented, type SegmentedOption } from './Segmented';

export function RangeControl({ value, onChange }: { value: Range; onChange(range: Range): void }) {
  const { t } = useTranslation();
  const options = useMemo<SegmentedOption<Range>[]>(() => [
    ...PRESET_RANGES.map((r) => ({ value: r, label: t('site.days', { n: Number(r) }) })),
    { value: 'custom', label: t('site.custom'), icon: <Calendar aria-hidden="true" className="size-4" /> },
  ], [t]);
  return <Segmented value={value} onChange={onChange} options={options} label={t('site.trend')} />;
}

/** 范围按钮上显示的文字，页头说明行也会用到 */
export function useRangeLabel() {
  const { t } = useTranslation();
  return (range: Range) => (range === 'custom' ? t('site.custom') : t('site.days', { n: Number(range) }));
}
