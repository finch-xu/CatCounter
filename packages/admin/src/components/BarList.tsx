import { useTranslation } from 'react-i18next';
import { useFormat } from '@/hooks/useFormat';
import { cn } from '@/lib/utils';
import { Panel } from './Panel';
import { EmptyState } from './States';

export interface BarItem {
  key: string;
  label: React.ReactNode;
  count: number;
  /** 相对最大值的比例，决定背景条长度 */
  ratio: number;
}

interface Props {
  title: string;
  hint?: string;
  tone: 'brand' | 'series-2';
  items: BarItem[];
}

export function BarList({ title, hint, tone, items }: Props) {
  const { t } = useTranslation();
  const fmt = useFormat();
  return (
    <Panel className="flex flex-col gap-3 px-5 pb-5 pt-4">
      <div className="flex min-h-8 items-baseline justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {items.length === 0 ? (
        <EmptyState className="py-6">{t('common.noData')}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={item.key} className="relative flex h-9 items-center justify-between gap-3 px-2.5">
              <span
                aria-hidden="true"
                className={cn('absolute inset-y-0 left-0 rounded-lg', tone === 'brand' ? 'bg-brand-soft' : 'bg-series-2-soft')}
                style={{ width: `${Math.max(item.ratio * 100, 2)}%` }}
              />
              <span className="relative flex min-w-0 items-center gap-2.5 truncate">{item.label}</span>
              <span className="num relative font-semibold">{fmt.n(item.count)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
