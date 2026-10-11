import { describe, expect, it } from 'vitest';
import { applyPatch, nextSort, parseFilters, toSearchParams } from '@/lib/detailsFilters';

const now = new Date('2026-10-11T03:00:00Z');
const parse = (qs: string) => parseFilters(new URLSearchParams(qs), now);

describe('parseFilters', () => {
  it('空地址栏给出默认值', () => {
    expect(parse('')).toEqual({
      site: '', range: '30', from: '2026-09-12', to: '2026-10-11',
      q: '', group: '', sort: 'range_pv', dir: 'desc', page: 1,
    });
  });
  it('非法值回落到默认值', () => {
    const f = parse('range=14&sort=bogus&dir=xyz&page=-1');
    expect(f).toMatchObject({ range: '30', sort: 'range_pv', dir: 'desc', page: 1 });
    expect(parse('page=1.5').page).toBe(1);
    expect(parse('page=abc').page).toBe(1);
  });
  it('自定义范围使用地址栏里的日期，缺失时为空串', () => {
    expect(parse('range=custom&from=2026-01-01&to=2026-01-31')).toMatchObject({ from: '2026-01-01', to: '2026-01-31' });
    expect(parse('range=custom')).toMatchObject({ from: '', to: '' });
  });
  it('预设范围忽略地址栏里的日期', () => {
    expect(parse('range=7&from=2020-01-01')).toMatchObject({ from: '2026-10-05', to: '2026-10-11' });
  });
});

describe('toSearchParams', () => {
  it('range 总是写入，其余默认值省略', () => {
    expect(toSearchParams(parse('')).toString()).toBe('range=30');
  });
  it('非默认值全部写入，自定义范围带日期', () => {
    const qs = toSearchParams({
      site: 's1', range: 'custom', from: '2026-01-01', to: '2026-01-31',
      q: 'hello', group: '/posts/', sort: 'pv', dir: 'asc', page: 3,
    });
    expect(Object.fromEntries(qs)).toEqual({
      site: 's1', range: 'custom', from: '2026-01-01', to: '2026-01-31',
      q: 'hello', group: '/posts/', sort: 'pv', dir: 'asc', page: '3',
    });
  });
});

describe('applyPatch', () => {
  const base = parse('page=4&q=a');
  it('翻页以外的改动回到第 1 页', () => {
    expect(applyPatch(base, { q: 'b' }).page).toBe(1);
    expect(applyPatch(base, { site: 's1' }).page).toBe(1);
  });
  it('翻页保持其他条件', () => {
    expect(applyPatch(base, { page: 5 })).toMatchObject({ page: 5, q: 'a' });
  });
});

describe('nextSort', () => {
  it('点当前列切换方向', () => {
    expect(nextSort(parse(''), 'range_pv')).toEqual({ sort: 'range_pv', dir: 'asc' });
  });
  it('点其他列：文本列默认升序，数值列默认降序', () => {
    expect(nextSort(parse(''), 'path')).toEqual({ sort: 'path', dir: 'asc' });
    expect(nextSort(parse(''), 'site')).toEqual({ sort: 'site', dir: 'asc' });
    expect(nextSort(parse(''), 'last_seen')).toEqual({ sort: 'last_seen', dir: 'desc' });
  });
});
