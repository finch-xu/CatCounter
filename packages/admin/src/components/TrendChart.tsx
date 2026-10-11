import type { DayPoint } from '@catcounter/shared';
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { useFormat } from '@/hooks/useFormat';
import { axisTick, seriesConfig, SeriesTooltip } from './chartParts';

/** 总览的 30 天趋势：PV 面积 + UV 虚线 */
export function TrendChart({ series, label }: { series: DayPoint[]; label: string }) {
  const fmt = useFormat();
  return (
    <div role="img" aria-label={label}>
      <ChartContainer config={seriesConfig} className="aspect-auto h-[260px] w-full">
        <ComposedChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis
            dataKey="day" tickLine={false} axisLine={{ stroke: 'var(--border)' }} tick={axisTick} tickMargin={8}
            interval="preserveStartEnd" minTickGap={40} tickFormatter={(d: string) => fmt.day(d)}
          />
          <YAxis
            width={44} allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick}
            tickFormatter={(v: number) => fmt.n(v)}
          />
          <ChartTooltip
            cursor={{ stroke: 'var(--foreground)', strokeOpacity: 0.25, strokeDasharray: '3 3' }}
            content={(p) => <SeriesTooltip point={p.active ? (p.payload?.[0]?.payload as DayPoint | undefined) : undefined} />}
          />
          <Area
            dataKey="pv" type="linear" stroke="var(--color-pv)" strokeWidth={2.2} fill="var(--color-pv)" fillOpacity={0.12}
            activeDot={{ r: 4.5, fill: 'var(--card)', stroke: 'var(--color-pv)', strokeWidth: 2.2 }} isAnimationActive={false}
          />
          <Line
            dataKey="uv" type="linear" stroke="var(--color-uv)" strokeWidth={2} strokeDasharray="5 4" dot={false}
            activeDot={{ r: 4, fill: 'var(--card)', stroke: 'var(--color-uv)', strokeWidth: 2 }} isAnimationActive={false}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}
