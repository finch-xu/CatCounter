import type { PageStatsSort } from '@catcounter/shared';
import { isRange, presetDates, type Range } from './dateRange';

export const PAGE_SIZE = 50;
export const SORTS: PageStatsSort[] = ['range_pv', 'range_uv', 'pv', 'uv', 'first_seen', 'last_seen', 'path', 'site'];

export interface Filters {
  site: string;
  range: Range;
  from: string;
  to: string;
  q: string;
  group: string;
  sort: PageStatsSort;
  dir: 'asc' | 'desc';
  page: number;
}

/** 地址栏是筛选条件的唯一来源；任何非法值都回落到默认值 */
export function parseFilters(params: URLSearchParams, now: Date = new Date()): Filters {
  const get = (k: string) => params.get(k) ?? '';
  const rawRange = get('range');
  const range: Range = isRange(rawRange) ? rawRange : '30';
  const dates = range === 'custom' ? { from: get('from'), to: get('to') } : presetDates(range, now);
  const sort = get('sort') as PageStatsSort;
  const page = Number(get('page'));
  return {
    site: get('site'),
    range,
    ...dates,
    q: get('q'),
    group: get('group'),
    sort: SORTS.includes(sort) ? sort : 'range_pv',
    dir: get('dir') === 'asc' ? 'asc' : 'desc',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** range 总是写入；其余默认值不写进 URL */
export function toSearchParams(f: Filters): URLSearchParams {
  const qs = new URLSearchParams();
  if (f.site) qs.set('site', f.site);
  qs.set('range', f.range);
  if (f.range === 'custom') {
    qs.set('from', f.from);
    qs.set('to', f.to);
  }
  if (f.q) qs.set('q', f.q);
  if (f.group) qs.set('group', f.group);
  if (f.sort !== 'range_pv') qs.set('sort', f.sort);
  if (f.dir !== 'desc') qs.set('dir', f.dir);
  if (f.page > 1) qs.set('page', String(f.page));
  return qs;
}

/** 除翻页外的任何改动都回到第一页 */
export function applyPatch(current: Filters, patch: Partial<Filters>): Filters {
  const next = { ...current, ...patch };
  if (!('page' in patch)) next.page = 1;
  return next;
}

/** 点当前列切换方向；点其他列时文本列默认升序、数值列默认降序 */
export function nextSort(f: Filters, key: PageStatsSort): Pick<Filters, 'sort' | 'dir'> {
  if (f.sort === key) return { sort: key, dir: f.dir === 'asc' ? 'desc' : 'asc' };
  return { sort: key, dir: key === 'path' || key === 'site' ? 'asc' : 'desc' };
}
