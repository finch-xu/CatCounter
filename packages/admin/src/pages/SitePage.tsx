import type { Site, SiteStats } from '@catcounter/shared';
import { ChevronRight, Globe, Monitor, SlidersHorizontal, Smartphone, Tablet } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { ApiError } from '@/api';
import { BarList } from '@/components/BarList';
import { ChartLegend } from '@/components/chartParts';
import { PageBody, PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/Panel';
import { RangeControl } from '@/components/RangeControl';
import { ShareBar } from '@/components/ShareBar';
import { SiteAvatar } from '@/components/SiteAvatar';
import { SiteTrendChart } from '@/components/SiteTrendChart';
import { EmptyState, ErrorState } from '@/components/States';
import { StatTile } from '@/components/StatTile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { SiteSettingsDialog } from '@/dialogs/SiteSettingsDialog';
import { useFormat } from '@/hooks/useFormat';
import { presetDates, type Range } from '@/lib/dateRange';
import { dailyAverage, peakDay, share, sumSeries, withRatios } from '@/lib/metrics';
import { cn } from '@/lib/utils';
import { forgetSite, useDeleteSite, useOverview, useSite, useSiteStats } from '@/queries';

const DEVICE_COLORS = ['var(--brand)', 'var(--series-2)', 'var(--site-3)', 'var(--site-4)'];
const DEVICE_ICONS = { desktop: Monitor, mobile: Smartphone, tablet: Tablet } as const;

interface Dates {
  from: string;
  to: string;
}

/** 站点页的时间范围：applied 是已生效的起止日期，custom 是自定义输入框里还没点“查询”的值 */
function useRangeState() {
  const [range, setRange] = useState<Range>('30');
  const [applied, setApplied] = useState<Dates>(() => presetDates('30'));
  const [custom, setCustom] = useState<Dates>(applied);

  function changeRange(next: Range) {
    setRange(next);
    // 切到自定义时沿用当前的起止日期，点“查询”才生效
    if (next === 'custom') setCustom(applied);
    else setApplied(presetDates(next));
  }

  return { range, applied, custom, setCustom, changeRange, applyCustom: () => setApplied(custom) };
}

export default function SitePage() {
  const { id = '' } = useParams();
  // 时间范围放在这一层：切换站点时沿用已选的范围；其余本地状态随 key 重建
  const rangeState = useRangeState();
  return <SiteView key={id} id={id} rangeState={rangeState} />;
}

function SiteView({ id, rangeState }: { id: string; rangeState: ReturnType<typeof useRangeState> }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const navigate = useNavigate();
  const { range, applied, custom, setCustom, changeRange, applyCustom } = rangeState;
  const [settingsOpen, setSettingsOpen] = useState(false);

  const overview = useOverview();
  const site = useSite(id);
  const stats = useSiteStats(id, applied.from, applied.to);

  const index = Math.max(0, overview.data?.sites.findIndex((s) => s.id === id) ?? 0);
  const today = overview.data?.sites.find((s) => s.id === id)?.today;

  // 站点被删除后，等本页卸载再清它的缓存，避免还挂载着的查询去请求已删除的站点
  const queryClient = useQueryClient();
  const deleted = useRef(false);
  useEffect(() => () => {
    if (deleted.current) forgetSite(queryClient, id);
  }, [queryClient, id]);

  // 删除由本页发起而不是弹窗里的分页：弹窗中途被关掉，结果回调也不会丢
  const remove = useDeleteSite(id);
  function deleteSite() {
    remove.mutate(undefined, {
      onSuccess: () => {
        deleted.current = true;
        setSettingsOpen(false);
        toast(t('site.deleted'));
        navigate('/', { replace: true });
      },
      onError: (e) => toast.error(e.message || t('common.operationFailed')),
    });
  }

  if (site.isError && site.error instanceof ApiError && site.error.status === 404) {
    return (
      <PageBody>
        <PageHeader title={t('site.fallbackTitle')} />
        <EmptyState>
          <p>{t('errors.not_found')}</p>
          <Link to="/" className="mt-2 inline-block font-semibold text-brand-text hover:underline">{t('sidebar.overview')}</Link>
        </EmptyState>
      </PageBody>
    );
  }

  const name = site.data?.name ?? t('site.fallbackTitle');
  const detailsLink =
    `/details?site=${encodeURIComponent(id)}&range=${range}` + (range === 'custom' ? `&from=${applied.from}&to=${applied.to}` : '');

  return (
    <PageBody>
      <PageHeader
        leading={<SiteAvatar name={name} index={index} size="lg" />}
        eyebrow={
          <span className="flex items-center gap-1.5">
            <Link to="/" className="hover:text-brand-text">{t('sidebar.overview')}</Link>
            <ChevronRight aria-hidden="true" className="size-3" />
            <span>{t('sidebar.sites')}</span>
          </span>
        }
        title={name}
        actions={
          <>
            <RangeControl value={range} onChange={changeRange} />
            <Button variant="outline" size="touch" className="bg-card" disabled={!site.data} onClick={() => setSettingsOpen(true)}>
              <SlidersHorizontal aria-hidden="true" />
              {t('common.settings')}
            </Button>
          </>
        }
      />

      {range === 'custom' && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            applyCustom();
          }}
        >
          <Input
            type="date" aria-label={t('site.from')} value={custom.from} max={custom.to || undefined}
            onChange={(e) => setCustom({ ...custom, from: e.target.value })} className="h-11 w-40 bg-card"
          />
          <span className="text-muted-foreground">{t('site.to')}</span>
          <Input
            type="date" aria-label={t('site.until')} value={custom.to} min={custom.from || undefined}
            onChange={(e) => setCustom({ ...custom, to: e.target.value })} className="h-11 w-40 bg-card"
          />
          <Button type="submit" variant="outline" size="touch" className="bg-card" disabled={!custom.from || !custom.to}>
            {t('site.apply')}
          </Button>
        </form>
      )}

      {site.data && <SiteMeta site={site.data} />}

      {site.isError ? (
        <ErrorState message={site.error.message} onRetry={() => void site.refetch()} />
      ) : stats.isError ? (
        <ErrorState message={stats.error.message} onRetry={() => void stats.refetch()} />
      ) : !site.data || !stats.data ? (
        <SiteSkeleton />
      ) : (
        <div className={cn('flex flex-col gap-5 transition-opacity', stats.isPlaceholderData && 'opacity-60')}>
          <section className="flex flex-wrap gap-4">
            <RangeTiles stats={stats.data} />
            <StatTile
              label={t('stats.totalPv')} value={fmt.n(site.data.pv)}
              hint={today && t('stats.todayPlus', { n: fmt.n(today.pv) })}
            />
            <StatTile
              label={t('stats.totalUv')} value={fmt.n(site.data.uv)}
              hint={today && t('stats.todayPlus', { n: fmt.n(today.uv) })}
            />
          </section>
          <SiteCharts stats={stats.data} detailsLink={detailsLink} />
        </div>
      )}

      {site.data && (
        <SiteSettingsDialog
          site={site.data} open={settingsOpen} onOpenChange={setSettingsOpen} onDelete={deleteSite} deleting={remove.isPending}
        />
      )}
    </PageBody>
  );
}

/** 地区：代码小标 + 本地化名称；查不到名称的代码（如 T1）只显示代码本身 */
function RegionLabel({ code }: { code: string }) {
  const fmt = useFormat();
  if (!code) return <span>–</span>;
  const name = fmt.region(code);
  return (
    <>
      <span className="w-6 shrink-0 text-[11px] font-semibold tracking-wide text-series-2">{code}</span>
      {name !== code && <span className="truncate">{name}</span>}
    </>
  );
}

function SiteMeta({ site }: { site: Site }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const chip = 'inline-flex max-w-full items-center gap-1.5 rounded-full border bg-card px-2.5 py-1';
  return (
    <ul className="flex flex-wrap gap-2 text-xs text-subtle">
      {site.origins.map((origin) => (
        <li key={origin} className={chip}>
          <Globe aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{origin}</span>
        </li>
      ))}
      <li className={cn(chip, 'tabular-nums')}>
        {site.retention_days ? t('site.retentionDays', { n: fmt.n(site.retention_days) }) : t('site.retentionForever')}
      </li>
      <li className={cn(chip, 'tabular-nums')}>{t('site.createdOn', { date: fmt.date(site.created_at * 1000) })}</li>
    </ul>
  );
}

function SiteSkeleton() {
  return (
    <>
      <div className="flex flex-wrap gap-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[126px] flex-1 basis-[220px] rounded-[14px]" />)}
      </div>
      <Skeleton className="h-[360px] rounded-[14px]" />
      <Skeleton className="h-[420px] rounded-[14px]" />
    </>
  );
}

function RangeTiles({ stats }: { stats: SiteStats }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const sum = useMemo(() => sumSeries(stats.series), [stats.series]);
  const avg = useMemo(() => dailyAverage(stats.series), [stats.series]);
  return (
    <>
      <StatTile label={t('stats.rangePv')} value={fmt.n(sum.pv)} hint={t('stats.dailyAvg', { n: fmt.n(avg.pv) })} />
      <StatTile label={t('stats.rangeUv')} value={fmt.n(sum.uv)} hint={t('stats.dailyAvg', { n: fmt.n(avg.uv) })} />
    </>
  );
}

function SiteCharts({ stats, detailsLink }: { stats: SiteStats; detailsLink: string }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const peak = useMemo(() => peakDay(stats.series), [stats.series]);
  const topPv = stats.pages.reduce((a, p) => Math.max(a, p.pv), 0);
  const referrers = useMemo(() => withRatios(stats.referrers), [stats.referrers]);
  const countries = useMemo(() => withRatios(stats.countries), [stats.countries]);
  const devices = useMemo(() => withRatios(stats.devices), [stats.devices]);
  const deviceLabel = (value: string) =>
    value === 'desktop' ? t('site.deviceDesktop')
    : value === 'mobile' ? t('site.deviceMobile')
    : value === 'tablet' ? t('site.deviceTablet')
    : value || '–';
  const peakText = peak && peak.pv > 0 ? `, ${t('overview.peak')} ${fmt.n(peak.pv)} · ${fmt.day(peak.day)}` : '';

  return (
    <>
      <Panel className="flex flex-col gap-3.5 px-5.5 pb-4 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{t('site.trend')}</h2>
            <div className="text-xs tabular-nums text-muted-foreground">
              {fmt.day(stats.from)} – {fmt.day(stats.to)} · {t('site.byDay')}
            </div>
          </div>
          <ChartLegend />
        </div>
        <SiteTrendChart series={stats.series} label={`${t('site.trend')}${peakText}`} />
      </Panel>

      <section className="flex flex-wrap items-start gap-4">
        <Panel className="min-w-0 flex-[1.6] basis-[440px] overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-2.5">
            <h2 className="text-base font-semibold">{t('site.topPages')}</h2>
            <Link to={detailsLink} className="inline-flex min-h-11 items-center gap-1 text-[13px] font-semibold text-brand-text hover:underline">
              {t('site.allPages')}
              <ChevronRight aria-hidden="true" className="size-3.5" strokeWidth={2.2} />
            </Link>
          </div>
          {stats.pages.length === 0 ? (
            <EmptyState>{t('common.noData')}</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[440px] table-fixed border-collapse">
                <thead>
                  <tr className="bg-muted text-xs text-muted-foreground [&>th]:border-y [&>th]:border-grid [&>th]:px-2 [&>th]:py-2 [&>th]:font-medium">
                    <th scope="col" className="w-11 pl-5! text-left">#</th>
                    <th scope="col" className="text-left">{t('details.page')}</th>
                    <th scope="col" className="w-20 text-right">PV</th>
                    <th scope="col" className="w-20 pr-5! text-right">UV</th>
                  </tr>
                </thead>
                <tbody className="[&>tr:not(:last-child)>td]:border-b [&>tr>td]:border-grid [&>tr>td]:px-2 [&>tr>td]:py-2.5 [&>tr>td]:align-top">
                  {stats.pages.map((p, i) => (
                    <tr key={p.path}>
                      <td className={cn('num pl-5! font-semibold', i < 3 ? 'text-brand-text' : 'text-muted-foreground')}>{i + 1}</td>
                      <td>
                        <div className="truncate font-semibold" title={p.title || p.path}>{p.title || p.path}</div>
                        {p.title && <div className="truncate text-xs text-muted-foreground" title={p.path}>{p.path}</div>}
                        <div
                          className={cn('mt-1.5 h-1 rounded-full', i < 3 ? 'bg-brand' : 'bg-brand/40')}
                          style={{ width: `${Math.max(share(p.pv, topPv) * 100, 1)}%` }}
                        />
                      </td>
                      <td className="num text-right font-semibold">{fmt.n(p.pv)}</td>
                      <td className="num pr-5! text-right text-subtle">{fmt.n(p.uv)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="min-w-0 flex-1 basis-[280px]">
          <BarList
            title={t('site.referrers')} hint={t('site.visits')} tone="brand"
            items={referrers.map((r) => ({
              key: r.value,
              label: <span className="truncate">{r.value === 'direct' ? t('site.referrerDirect') : r.value || '–'}</span>,
              count: r.count,
              ratio: r.ratio,
            }))}
          />
        </div>

        <div className="flex min-w-0 flex-1 basis-[280px] flex-col gap-4">
          <BarList
            title={t('site.countries')} hint={t('site.visits')} tone="series-2"
            items={countries.map((c) => ({
              key: c.value,
              label: <RegionLabel code={c.value} />,
              count: c.count,
              ratio: c.ratio,
            }))}
          />
          <Panel className="flex flex-col gap-3.5 px-5 pb-5 pt-4">
            <h2 className="flex min-h-8 items-center text-base font-semibold">{t('site.devices')}</h2>
            {devices.length === 0 ? (
              <EmptyState className="py-6">{t('common.noData')}</EmptyState>
            ) : (
              <>
                <ShareBar
                  segments={devices.map((d, i) => ({
                    key: d.value, value: d.count, color: DEVICE_COLORS[i % DEVICE_COLORS.length]!, label: deviceLabel(d.value),
                  }))}
                />
                <ul className="flex flex-col gap-2.5">
                  {devices.map((d, i) => {
                    const Icon = DEVICE_ICONS[d.value as keyof typeof DEVICE_ICONS] ?? Monitor;
                    return (
                      <li key={d.value} className="flex items-center gap-2.5">
                        <Icon aria-hidden="true" className="size-4 shrink-0" style={{ color: DEVICE_COLORS[i % DEVICE_COLORS.length] }} />
                        <span className="min-w-0 flex-1 truncate">{deviceLabel(d.value)}</span>
                        <span className="num text-subtle">{fmt.n(d.count)}</span>
                        <span className="num w-11 text-right font-semibold">{fmt.pct(d.share, 0)}</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </Panel>
        </div>
      </section>
    </>
  );
}
