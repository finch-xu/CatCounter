import type { Overview } from '@catcounter/shared';
import { ChevronRight, Moon, Plus, Sun } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { ChartLegend } from '@/components/chartParts';
import { DeltaChip } from '@/components/DeltaChip';
import { PageBody, PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/Panel';
import { ShareBar } from '@/components/ShareBar';
import { SiteAvatar, SiteDot } from '@/components/SiteAvatar';
import { Sparkline } from '@/components/Sparkline';
import { EmptyState, ErrorState } from '@/components/States';
import { StatTile } from '@/components/StatTile';
import { TrendChart } from '@/components/TrendChart';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NewSiteDialog } from '@/dialogs/NewSiteDialog';
import { useFormat } from '@/hooks/useFormat';
import { todayLabel } from '@/lib/format';
import { useLocale } from '@/hooks/useLocale';
import { useTheme } from '@/hooks/useTheme';
import { dailyAverage, peakDay, share, sumSeries, viewsPerVisitor, weekOverWeek } from '@/lib/metrics';
import { siteColor } from '@/lib/siteColor';
import { useOverview } from '@/queries';

export default function OverviewPage() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { resolved, toggle } = useTheme();
  const { data, isPending, isError, error, refetch } = useOverview();
  const [newOpen, setNewOpen] = useState(false);
  const today = useMemo(() => todayLabel(new Date(), locale), [locale]);

  return (
    <PageBody>
      <PageHeader
        eyebrow={today}
        title={t('overview.title')}
        actions={
          <>
            <Button variant="outline" size="icon-touch" className="bg-card" aria-label={t('common.toggleTheme')} onClick={toggle}>
              {resolved === 'dark' ? <Sun aria-hidden="true" className="size-4.5" /> : <Moon aria-hidden="true" className="size-4.5" />}
            </Button>
            <Button size="touch" onClick={() => setNewOpen(true)}>
              <Plus aria-hidden="true" strokeWidth={2.2} />
              {t('overview.newSite')}
            </Button>
          </>
        }
      />
      {isError ? (
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      ) : isPending ? (
        <OverviewSkeleton />
      ) : (
        <OverviewContent data={data} />
      )}
      <NewSiteDialog open={newOpen} onOpenChange={setNewOpen} />
    </PageBody>
  );
}

function OverviewSkeleton() {
  return (
    <>
      <div className="flex flex-wrap gap-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[126px] flex-1 basis-[220px] rounded-[14px]" />)}
      </div>
      <Skeleton className="h-[380px] rounded-[14px]" />
      <Skeleton className="h-[280px] rounded-[14px]" />
    </>
  );
}

function OverviewContent({ data }: { data: Overview }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const navigate = useNavigate();
  const { series, sites, totals } = data;

  const m = useMemo(() => ({
    sum: sumSeries(series),
    avg: dailyAverage(series),
    peak: peakDay(series),
    wow: weekOverWeek(series),
    perVisitor: viewsPerVisitor(series),
    yesterday: series.at(-2),
    recent: series.slice(-14),
  }), [series]);

  const yesterdayHint = (key: 'pv' | 'uv') => (m.yesterday ? t('stats.yesterday', { n: fmt.n(m.yesterday[key]) }) : undefined);
  const wowChip = (key: 'pv' | 'uv') => (
    <DeltaChip value={m.wow?.delta[key] ?? null} prefix={t('stats.wowShort')} title={t('stats.wow')} />
  );
  const peakText = m.peak && m.peak.pv > 0 ? `${fmt.n(m.peak.pv)} · ${fmt.day(m.peak.day)}` : '–';
  const trendRange = series.length ? `${fmt.day(series[0]!.day)} – ${fmt.day(series.at(-1)!.day)}` : '';

  return (
    <>
      <section className="flex flex-wrap gap-4">
        <StatTile
          label={t('stats.todayPv')} value={fmt.n(totals.today.pv)} hint={yesterdayHint('pv')}
          chip={wowChip('pv')}
          chart={<Sparkline values={m.recent.map((p) => p.pv)} color="var(--brand)" label="PV" />}
        />
        <StatTile
          label={t('stats.todayUv')} value={fmt.n(totals.today.uv)} hint={yesterdayHint('uv')}
          chip={wowChip('uv')}
          chart={<Sparkline values={m.recent.map((p) => p.uv)} color="var(--series-2)" label="UV" />}
        />
        <StatTile
          label={t('stats.totalPv')} value={fmt.n(totals.all.pv)}
          hint={`${t('stats.last30', { n: fmt.n(m.sum.pv) })} · ${t('stats.dailyAvg', { n: fmt.n(m.avg.pv) })}`}
        />
        <StatTile label={t('stats.totalUv')} value={fmt.n(totals.all.uv)} hint={t('stats.dailyAvg', { n: fmt.n(m.avg.uv) })} />
      </section>

      <section className="flex flex-wrap items-stretch gap-4">
        <Panel className="flex min-w-0 flex-[2.2] basis-[520px] flex-col gap-3.5 px-5.5 pb-4 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">{t('overview.trendTitle')}</h2>
              <div className="text-xs tabular-nums text-muted-foreground">{t('overview.allSites')} · {trendRange}</div>
            </div>
            <ChartLegend uvDashed />
          </div>
          <TrendChart series={series} label={`${t('overview.trendTitle')}, ${t('overview.peak')} ${peakText}`} />
          <dl className="flex flex-wrap gap-x-7 gap-y-2 border-t border-grid pt-3 text-[13px] text-subtle">
            <Fact label={t('overview.avgPv')} value={fmt.n(m.avg.pv)} />
            <Fact label={t('overview.avgUv')} value={fmt.n(m.avg.uv)} />
            <Fact label={t('overview.peak')} value={peakText} />
            <Fact label={t('overview.perVisitor')} value={m.perVisitor === null ? '–' : m.perVisitor.toFixed(2)} />
          </dl>
        </Panel>

        <Panel className="flex min-w-0 flex-1 basis-[300px] flex-col gap-4 px-5.5 py-5">
          <div>
            <h2 className="text-base font-semibold">{t('overview.todayShare')}</h2>
            <div className="text-xs text-muted-foreground">{t('overview.todayShareHint')}</div>
          </div>
          {totals.today.pv > 0 ? (
            <>
              <ShareBar segments={sites.map((s, i) => ({ key: s.id, value: s.today.pv, color: siteColor(i), label: s.name }))} />
              <ul className="flex flex-col gap-2.5">
                {sites.map((s, i) => (
                  <li key={s.id} className="flex items-center gap-2.5">
                    <SiteDot index={i} />
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                    <span className="num text-subtle">{fmt.n(s.today.pv)}</span>
                    <span className="num w-12 text-right font-semibold">{fmt.pct(share(s.today.pv, totals.today.pv))}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <EmptyState className="py-6">{t('overview.noTrafficToday')}</EmptyState>
          )}
          {m.wow && (
            <div className="mt-auto flex flex-col gap-3 border-t border-grid pt-4">
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold">{t('overview.weekCompare')}</h3>
                <span className="text-xs text-muted-foreground">{t('overview.currentPrevious')}</span>
              </div>
              <CompareBars label="PV" current={m.wow.current.pv} previous={m.wow.previous.pv} color="var(--brand)" />
              <CompareBars label="UV" current={m.wow.current.uv} previous={m.wow.previous.uv} color="var(--series-2)" />
            </div>
          )}
        </Panel>
      </section>

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5.5 pb-2 pt-3">
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-base font-semibold">{t('overview.sites')}</h2>
            {sites.length > 0 && <span className="text-xs text-muted-foreground">{t('overview.sitesHint', { n: fmt.n(sites.length) })}</span>}
          </div>
          <Link to="/details" className="inline-flex min-h-11 items-center gap-1 text-[13px] font-semibold text-brand-text hover:underline">
            {t('overview.viewAllPages')}
            <ChevronRight aria-hidden="true" className="size-3.5" strokeWidth={2.2} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="bg-muted text-right text-xs text-muted-foreground [&>th]:border-y [&>th]:border-grid [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-medium">
                <th scope="col" className="pl-5.5! text-left">{t('common.name')}</th>
                <th scope="col">{t('stats.todayPv')}</th>
                <th scope="col">{t('stats.todayUv')}</th>
                <th scope="col">{t('stats.totalPv')}</th>
                <th scope="col">{t('stats.totalUv')}</th>
                <th scope="col" className="pr-5.5! text-left">{t('overview.shareToday')}</th>
              </tr>
            </thead>
            <tbody className="[&>tr:not(:last-child)>td]:border-b [&>tr>td]:border-grid">
              {sites.map((s, i) => {
                const ratio = share(s.today.pv, totals.today.pv);
                return (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/sites/${s.id}`)}
                    className="cursor-pointer text-right transition-colors hover:bg-muted [&>td]:px-4 [&>td]:py-3.5"
                  >
                    <td className="pl-5.5! text-left">
                      <Link to={`/sites/${s.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-3">
                        <SiteAvatar name={s.name} index={i} />
                        <span className="min-w-0 leading-snug">
                          <span className="block font-semibold">{s.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{s.origins.join(t('common.listSeparator'))}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="num font-semibold">{fmt.n(s.today.pv)}</td>
                    <td className="num">{fmt.n(s.today.uv)}</td>
                    <td className="num">{fmt.n(s.pv)}</td>
                    <td className="num">{fmt.n(s.uv)}</td>
                    <td className="pr-5.5!">
                      <div className="flex items-center gap-2.5">
                        <span className="block h-1.5 w-30 rounded-full bg-accent">
                          <span className="block h-1.5 rounded-full" style={{ width: `${ratio * 100}%`, background: siteColor(i) }} />
                        </span>
                        <span className="num text-[13px] text-subtle">{fmt.pct(ratio)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sites.length === 0 && (
                <tr><td colSpan={6} className="px-5.5 py-10 text-center text-muted-foreground">{t('overview.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <dt>{label}</dt>
      <dd className="num font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function CompareBars({ label, current, previous, color }: { label: string; current: number; previous: number; color: string }) {
  const fmt = useFormat();
  const max = Math.max(current, previous);
  return (
    <div className="flex flex-col gap-1.5 text-[13px]">
      <div className="flex justify-between">
        <span className="text-subtle">{label}</span>
        <span className="num"><strong>{fmt.n(current)}</strong> <span className="text-muted-foreground">/ {fmt.n(previous)}</span></span>
      </div>
      <div className="h-2 rounded-full" style={{ width: `${share(current, max) * 100}%`, background: color }} />
      <div className="h-2 rounded-full opacity-30" style={{ width: `${share(previous, max) * 100}%`, background: color }} />
    </div>
  );
}
