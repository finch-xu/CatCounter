import { ArrowDown, ArrowUp } from 'lucide-react';
import { useFormat } from '@/hooks/useFormat';
import { cn } from '@/lib/utils';

/** 环比变化；value 为相对变化（0.1 表示 +10%），无法比较时不渲染 */
export function DeltaChip({ value, prefix, title }: { value: number | null; prefix?: string; title?: string }) {
  const fmt = useFormat();
  if (value === null) return null;
  const up = value >= 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      title={title}
      className={cn(
        'num inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold',
        up ? 'bg-positive-soft text-positive' : 'bg-destructive-soft text-destructive',
      )}
    >
      {prefix && <span className="font-medium opacity-80">{prefix}</span>}
      <Icon aria-hidden="true" className="size-3" strokeWidth={2.6} />
      <span>{fmt.pct(Math.abs(value))}</span>
    </span>
  );
}
