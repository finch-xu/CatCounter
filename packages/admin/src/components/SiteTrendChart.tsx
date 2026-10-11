import type { DayPoint } from '@catcounter/shared';
import { Bar, CartesianGrid, Cell, ComposedChart, Line, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { useFormat } from '@/hooks/useFormat';
import { peakDay } from '@/lib/metrics';
import { axisTick, seriesConfig, SeriesTooltip } from './chartParts';

/** 站点页的区间趋势：PV 柱（峰值加深）+ UV 折线 */
export function SiteTrendChart({ series, label }: { series: DayPoint[]; label: string }) {
  const fmt = useFormat();
  const peak = peakDay(series);
  return (
    <div role="img" aria-label={label}>
      <ChartContainer config={seriesConfig} className="aspect-auto h-[280px] w-full">
        <ComposedChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis
            dataKey="day" tickLine={false} axisLine={{ stroke: 'var(--border)' }} tick={axisTick} tickMargin={8}
            interval="preserveStartEnd" minTickGap={series.length > 45 ? 60 : 40} tickFormatter={(d: string) => fmt.day(d)}
          />
          <YAxis
            width={44} allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick}
            tickFormatter={(v: number) => fmt.n(v)}
          />
          <ChartTooltip
            cursor={{ fill: 'var(--foreground)', fillOpacity: 0.05 }}
            content={(p) => <SeriesTooltip point={p.active ? (p.payload?.[0]?.payload as DayPoint | undefined) : undefined} />}
          />
          <Bar dataKey="pv" fill="var(--color-pv)" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false}>
            {series.map((p) => (
              <Cell key={p.day} fillOpacity={peak && peak.pv > 0 && p.day === peak.day ? 1 : 0.55} />
            ))}
          </Bar>
          <Line
            dataKey="uv" type="linear" stroke="var(--color-uv)" strokeWidth={2.2} dot={false}
            activeDot={{ r: 4, fill: 'var(--card)', stroke: 'var(--color-uv)', strokeWidth: 2 }} isAnimationActive={false}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}
