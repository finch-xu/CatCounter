import type { PageStatsRow, PageStatsSort } from '@catcounter/shared';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Info, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { PageBody, PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/Panel';
import { RangeControl, useRangeLabel } from '@/components/RangeControl';
import { SiteDot } from '@/components/SiteAvatar';
import { EmptyState, ErrorState } from '@/components/States';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useFormat } from '@/hooks/useFormat';
import type { Range } from '@/lib/dateRange';
import { applyPatch, nextSort, PAGE_SIZE, parseFilters, toSearchParams, type Filters } from '@/lib/detailsFilters';
import { share } from '@/lib/metrics';
import { cn } from '@/lib/utils';
import { useOverview, usePageStats } from '@/queries';

/** shadcn 的 Select 不接受空字符串作选项值，用哨兵值表示“全部站点” */
const ALL_SITES = '__all__';
const GROUP_CHIPS = 8;

interface Column {
  key: PageStatsSort;
  label: string;
  num: boolean;
  hint?: string;
}

export default function DetailsPage() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const rangeLabel = useRangeLabel();
  const [params, setParams] = useSearchParams();
  // 地址栏是筛选条件的唯一来源：界面上的改动都写回 query，查询键随之变化
  const filters = useMemo(() => parseFilters(params), [params]);
  const sites = useOverview().data?.sites ?? [];
  const siteIndex = useMemo(() => new Map(sites.map((s, i) => [s.id, i])), [sites]);

  const [qInput, setQInput] = useState(filters.q);
  // 输入法组字期间输入框里是拼音等中间态，不能当成搜索词
  const [composing, setComposing] = useState(false);
  const [fromInput, setFromInput] = useState(filters.from);
  const [toInput, setToInput] = useState(filters.to);

  // 地址栏变化（包括浏览器后退）时，把输入框同步成地址栏里的值
  useEffect(() => setQInput(filters.q), [filters.q]);
  useEffect(() => {
    setFromInput(filters.from);
    setToInput(filters.to);
  }, [filters.from, filters.to]);

  /** 合并改动写回地址栏；输入框里还没生效的搜索词一并带上 */
  function update(patch: Partial<Filters>) {
    setParams(toSearchParams(applyPatch({ ...filters, q: qInput.trim() }, patch)), { replace: true });
  }

  // 搜索防抖 300ms；依赖变化时清掉上一个定时器，卸载时同理
  useEffect(() => {
    if (composing || qInput.trim() === filters.q) return;
    const timer = setTimeout(() => update({}), 300);
    return () => clearTimeout(timer);
    // update 每次渲染都是新函数，这里只关心输入内容、已生效的搜索词和组字状态
  }, [qInput, filters.q, composing]);

  const enabled = Boolean(filters.from && filters.to);
  const query = usePageStats(
    {
      site: filters.site, from: filters.from, to: filters.to, q: filters.q, group: filters.group,
      sort: filters.sort, dir: filters.dir, limit: PAGE_SIZE, offset: (filters.page - 1) * PAGE_SIZE,
    },
    enabled,
  );
  const data = query.data;
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const offset = (filters.page - 1) * PAGE_SIZE;

  const { chips, rest } = useMemo(() => {
    const groups = [...(data?.groups ?? [])].sort((a, b) => b.count - a.count);
    const chips = groups.slice(0, GROUP_CHIPS);
    // 地址栏里的分组可能不在列表中（比如只有一个页面的分组），补进去让它能显示为选中
    if (filters.group && !groups.some((g) => g.prefix === filters.group)) {
      chips.push({ prefix: filters.group, count: data?.total ?? 0 });
    }
    return { chips, rest: groups.slice(GROUP_CHIPS) };
  }, [data, filters.group]);

  /** 只看一个站点时，站点列每行都一样，不显示 */
  const columns = useMemo<Column[]>(() => [
    { key: 'path', label: t('details.page'), num: false },
    ...(filters.site ? [] : [{ key: 'site' as const, label: t('details.site'), num: false }]),
    { key: 'range_pv', label: t('stats.rangePv'), num: true },
    { key: 'range_uv', label: t('stats.rangeUv'), num: true, hint: t('details.rangeUvHint') },
    { key: 'pv', label: t('stats.totalPv'), num: true },
    { key: 'uv', label: t('stats.totalUv'), num: true },
    { key: 'first_seen', label: t('details.firstSeen'), num: true },
    { key: 'last_seen', label: t('details.lastSeen'), num: true },
  ], [filters.site, t]);

  const siteName = sites.find((s) => s.id === filters.site)?.name;
  const rangeStart = filters.from ? Date.parse(`${filters.from}T00:00:00Z`) : NaN;
  const maxRangePv = data?.rows.reduce((a, r) => Math.max(a, r.range_pv), 0) ?? 0;

  return (
    <PageBody className="gap-4.5">
      <PageHeader
        eyebrow={`${siteName ?? t('details.allSites')} · ${rangeLabel(filters.range)}`}
        title={t('details.title')}
        actions={data && <span className="text-[13px] tabular-nums text-subtle">{t('details.total', { count: data.total })}</span>}
      />

      <Panel className="flex flex-col gap-3 px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-0 flex-1 basis-[260px]">
            <label htmlFor="details-q" className="sr-only">{t('details.searchPlaceholder')}</label>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
            <Input
              id="details-q" type="search" value={qInput} onChange={(e) => setQInput(e.target.value)}
              onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)}
              placeholder={t('details.searchPlaceholder')} className="h-11 rounded-xl bg-muted pl-10"
            />
          </div>
          <Select value={filters.site || ALL_SITES} onValueChange={(v) => update({ site: v === ALL_SITES ? '' : v, group: '' })}>
            <SelectTrigger aria-label={t('details.site')} className="max-w-56 bg-card data-[size=default]:h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SITES}>{t('details.allSites')}</SelectItem>
              {sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <RangeControl
            value={filters.range}
            onChange={(range: Range) => update(range === 'custom' ? { range, from: filters.from, to: filters.to } : { range })}
          />
        </div>

        {filters.range === 'custom' && (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              update({ from: fromInput, to: toInput });
            }}
          >
            <Input
              type="date" aria-label={t('site.custom')} value={fromInput} max={toInput || undefined}
              onChange={(e) => setFromInput(e.target.value)} className="h-11 w-40"
            />
            <span className="text-muted-foreground">{t('site.to')}</span>
            <Input
              type="date" aria-label={t('site.to')} value={toInput} min={fromInput || undefined}
              onChange={(e) => setToInput(e.target.value)} className="h-11 w-40"
            />
            <Button type="submit" variant="outline" size="touch" disabled={!fromInput || !toInput}>{t('site.apply')}</Button>
          </form>
        )}

        {chips.length > 0 && (
          <div role="group" aria-label={t('details.group')} className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="pr-0.5 text-muted-foreground">{t('details.group')}</span>
            <GroupChip active={!filters.group} onClick={() => update({ group: '' })}>{t('details.groupAll')}</GroupChip>
            {chips.map((g) => (
              <GroupChip key={g.prefix} active={filters.group === g.prefix} onClick={() => update({ group: g.prefix })}>
                {g.prefix} <span className="num opacity-70">{fmt.n(g.count)}</span>
              </GroupChip>
            ))}
            {rest.length > 0 && (
              <Select value={rest.some((g) => g.prefix === filters.group) ? filters.group : ''} onValueChange={(group) => update({ group })}>
                <SelectTrigger size="sm" aria-label={t('common.more')} className="rounded-full bg-card data-[size=sm]:h-8">
                  <SelectValue placeholder={t('common.more')} />
                </SelectTrigger>
                <SelectContent>
                  {rest.map((g) => <SelectItem key={g.prefix} value={g.prefix}>{g.prefix} ({fmt.n(g.count)})</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </Panel>

      {query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
      ) : (
        <Panel className="overflow-hidden">
          <div className={cn('overflow-x-auto transition-opacity', query.isPlaceholderData && 'opacity-60')}>
            <table className="w-full min-w-[920px] border-collapse">
              <thead>
                <tr className="bg-muted text-xs text-muted-foreground [&>th]:border-b [&>th]:border-grid [&>th]:px-2 [&>th]:font-medium">
                  {columns.map((col, i) => (
                    <th
                      key={col.key} scope="col"
                      aria-sort={filters.sort !== col.key ? 'none' : filters.dir === 'asc' ? 'ascending' : 'descending'}
                      className={cn(col.num ? 'text-right' : 'text-left', i === 0 && 'pl-5!', i === columns.length - 1 && 'pr-5!')}
                    >
                      <SortButton column={col} filters={filters} onSort={() => update(nextSort(filters, col.key))} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)>td]:border-b [&>tr>td]:border-grid [&>tr>td]:px-2 [&>tr>td]:py-2.5 [&>tr>td]:align-top">
                {!data && enabled && [0, 1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}><td colSpan={columns.length} className="px-5!"><Skeleton className="h-9" /></td></tr>
                ))}
                {data?.rows.map((p) => (
                  <Row
                    key={p.site_id + p.path} row={p} showSite={!filters.site} siteIndex={siteIndex.get(p.site_id) ?? 0}
                    isNew={p.first_seen * 1000 >= rangeStart} barRatio={share(p.range_pv, maxRangePv)}
                  />
                ))}
                {(data ? data.rows.length === 0 : !enabled) && (
                  <tr>
                    <td colSpan={columns.length}>
                      <EmptyState>{filters.q || filters.group ? t('details.noMatch') : t('common.noData')}</EmptyState>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {data && data.total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-grid bg-muted px-5 py-2.5 text-[13px] tabular-nums text-subtle">
              <span>{t('details.rows', { from: fmt.n(offset + 1), to: fmt.n(offset + data.rows.length), total: fmt.n(data.total) })}</span>
              {pageCount > 1 && (
                <div className="flex items-center gap-2.5">
                  <Button variant="outline" size="touch" className="bg-card font-normal" disabled={filters.page <= 1} onClick={() => update({ page: filters.page - 1 })}>
                    <ChevronLeft aria-hidden="true" />
                    {t('details.prev')}
                  </Button>
                  <span>{t('details.pageOf', { page: filters.page, pages: pageCount })}</span>
                  <Button variant="outline" size="touch" className="bg-card font-normal" disabled={filters.page >= pageCount} onClick={() => update({ page: filters.page + 1 })}>
                    {t('details.next')}
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </Panel>
      )}
    </PageBody>
  );
}

function GroupChip({ active, onClick, children }: { active: boolean; onClick(): void; children: React.ReactNode }) {
  return (
    <button
      type="button" aria-pressed={active} onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
        active ? 'border-foreground bg-foreground text-background' : 'bg-card text-subtle hover:bg-accent',
      )}
    >
      {children}
    </button>
  );
}

function SortButton({ column, filters, onSort }: { column: Column; filters: Filters; onSort(): void }) {
  const active = filters.sort === column.key;
  const Arrow = filters.dir === 'asc' ? ArrowUp : ArrowDown;
  const button = (
    <button
      type="button" onClick={onSort}
      className={cn('inline-flex h-11 items-center gap-1 whitespace-nowrap outline-none hover:text-foreground focus-visible:underline', active && 'font-semibold text-brand-text hover:text-brand-text')}
    >
      {column.label}
      {column.hint && <Info aria-hidden="true" className="size-3.5" />}
      {active && <Arrow aria-hidden="true" className="size-3" strokeWidth={2.6} />}
    </button>
  );
  if (!column.hint) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent className="max-w-64 text-left">{column.hint}</TooltipContent>
    </Tooltip>
  );
}

function Row({ row, showSite, siteIndex, isNew, barRatio }: {
  row: PageStatsRow; showSite: boolean; siteIndex: number; isNew: boolean; barRatio: number;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  return (
    <tr>
      <td className="max-w-0 pl-5! w-[38%]">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold" title={row.title || row.path}>{row.title || row.path}</span>
          {isNew && <span className="shrink-0 rounded-full bg-positive-soft px-1.5 text-[11px] font-semibold text-positive">{t('details.badgeNew')}</span>}
        </div>
        {row.title && <div className="truncate text-xs text-muted-foreground" title={row.path}>{row.path}</div>}
      </td>
      {showSite && (
        <td className="max-w-40">
          <span className="flex items-center gap-1.5 text-subtle" title={row.site_name}>
            <SiteDot index={siteIndex} />
            <span className="truncate">{row.site_name}</span>
          </span>
        </td>
      )}
      <td className="text-right">
        <div className={cn('num font-semibold', !row.range_pv && 'font-normal text-muted-foreground')}>{fmt.n(row.range_pv)}</div>
        {row.range_pv > 0 && <div className="ml-auto mt-1.5 h-1 rounded-full bg-brand" style={{ width: `${Math.max(barRatio * 88, 2)}px` }} />}
      </td>
      <td className={cn('num text-right', !row.range_uv && 'text-muted-foreground')}>{fmt.n(row.range_uv)}</td>
      <td className="num text-right text-subtle">{fmt.n(row.pv)}</td>
      <td className="num text-right text-subtle">{fmt.n(row.uv)}</td>
      <td className="num whitespace-nowrap text-right text-subtle" title={fmt.date(row.first_seen * 1000, 'long')}>{fmt.date(row.first_seen * 1000)}</td>
      <td className="whitespace-nowrap pr-5! text-right tabular-nums" title={fmt.date(row.last_seen * 1000, 'long')}>{fmt.rel(row.last_seen)}</td>
    </tr>
  );
}
