import type { DayPoint } from '@catcounter/shared';
import { useFormat } from '@/hooks/useFormat';
import type { ChartConfig } from '@/components/ui/chart';

export const seriesConfig = {
  pv: { label: 'PV', color: 'var(--brand)' },
  uv: { label: 'UV', color: 'var(--series-2)' },
} satisfies ChartConfig;

export const axisTick = { fill: 'var(--muted-foreground)', fontSize: 11 };

/** 两张趋势图共用的悬停提示：日期 + PV + UV */
export function SeriesTooltip({ point }: { point: DayPoint | undefined }) {
  const fmt = useFormat();
  if (!point) return null;
  return (
    <div className="min-w-32 rounded-lg bg-foreground px-3 py-2 text-xs text-background shadow-lg">
      <div className="mb-1 opacity-70">{fmt.day(point.day, true)}</div>
      <div className="flex justify-between gap-6"><span>PV</span><span className="num font-semibold">{fmt.n(point.pv)}</span></div>
      <div className="flex justify-between gap-6"><span>UV</span><span className="num font-semibold">{fmt.n(point.uv)}</span></div>
    </div>
  );
}

export function ChartLegend({ uvDashed = false }: { uvDashed?: boolean }) {
  return (
    <div className="flex items-center gap-4 text-[13px] text-subtle">
      <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-brand" />PV</span>
      <span className="inline-flex items-center gap-1.5">
        <span className={uvDashed ? 'w-3.5 border-t-2 border-dashed border-series-2' : 'h-0.5 w-3.5 rounded-full bg-series-2'} />UV
      </span>
    </div>
  );
}
