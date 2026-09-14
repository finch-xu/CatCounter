<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter, type LocationQuery } from 'vue-router';
import type { PageStatsList, PageStatsSort } from '@catcounter/shared';
import PageHeader from '../components/PageHeader.vue';
import SegmentedControl from '../components/SegmentedControl.vue';
import { api } from '../api';
import { isRange, presetDates, useRangeOptions, type Range } from '../composables/useDateRange';
import { useSites } from '../composables/useSites';
import { useToast } from '../composables/useToast';
import { relativeTime } from '../utils/time';

const route = useRoute();
const router = useRouter();
const { sites } = useSites();
const { toast } = useToast();
const { t, n, d, locale } = useI18n();
const rangeOptions = useRangeOptions();

const PAGE_SIZE = 50;
const SORTS: PageStatsSort[] = ['range_pv', 'range_uv', 'pv', 'uv', 'first_seen', 'last_seen', 'path', 'site'];

interface Filters {
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

const str = (v: LocationQuery[string]) => (typeof v === 'string' ? v : '');

/** 地址栏是筛选条件的唯一来源：界面上的改动都写回 query，再由 watch 触发加载 */
const filters = computed<Filters>(() => {
  const q = route.query;
  const range = isRange(q.range) ? q.range : '30';
  const dates = range === 'custom' ? { from: str(q.from), to: str(q.to) } : presetDates(range);
  const sort = str(q.sort) as PageStatsSort;
  const page = Number(str(q.page));
  return {
    site: str(q.site),
    range,
    ...dates,
    q: str(q.q),
    group: str(q.group),
    sort: SORTS.includes(sort) ? sort : 'range_pv',
    dir: q.dir === 'asc' ? 'asc' : 'desc',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
});

const qInput = ref('');
const fromInput = ref('');
const toInput = ref('');
let qTimer: ReturnType<typeof setTimeout> | undefined;

/** 合并改动写回地址栏；除翻页外的任何改动都回到第一页，默认值不写进 URL */
function update(patch: Partial<Filters>) {
  clearTimeout(qTimer);
  const next: Filters = { ...filters.value, q: qInput.value.trim(), ...patch };
  if (!('page' in patch)) next.page = 1;
  const query: Record<string, string> = {};
  if (next.site) query.site = next.site;
  query.range = next.range;
  if (next.range === 'custom') Object.assign(query, { from: next.from, to: next.to });
  if (next.q) query.q = next.q;
  if (next.group) query.group = next.group;
  if (next.sort !== 'range_pv') query.sort = next.sort;
  if (next.dir !== 'desc') query.dir = next.dir;
  if (next.page > 1) query.page = String(next.page);
  router.replace({ query });
}

// 地址栏变化（包括浏览器后退）时，把输入框同步成地址栏里的值
watch(filters, (f) => {
  qInput.value = f.q;
  fromInput.value = f.from;
  toInput.value = f.to;
}, { immediate: true });

watch(qInput, (v) => {
  clearTimeout(qTimer);
  if (v.trim() !== filters.value.q) qTimer = setTimeout(() => update({}), 300);
});
onBeforeUnmount(() => clearTimeout(qTimer));

const rangeModel = computed<Range>({
  get: () => filters.value.range,
  set: (range) => update(range === 'custom' ? { range, from: filters.value.from, to: filters.value.to } : { range }),
});
/** 换站点时分组列表会变，旧分组可能不存在了，所以一并清空 */
const siteModel = computed({
  get: () => filters.value.site,
  set: (site: string) => update({ site, group: '' }),
});
const groupModel = computed({
  get: () => filters.value.group,
  set: (group: string) => update({ group }),
});

const data = ref<PageStatsList | null>(null);
const loading = ref(false);
let seq = 0;

async function load() {
  const f = filters.value;
  if (!f.from || !f.to) return;
  const mine = ++seq;
  loading.value = true;
  try {
    const r = await api.pageStats({
      site: f.site, from: f.from, to: f.to, q: f.q, group: f.group, sort: f.sort, dir: f.dir,
      limit: PAGE_SIZE, offset: (f.page - 1) * PAGE_SIZE,
    });
    if (mine === seq) data.value = r;
  } catch (e) {
    if (mine === seq) toast(e instanceof Error ? e.message : t('common.loadFailed'), 'error');
  } finally {
    if (mine === seq) loading.value = false;
  }
}

// 离开本页时 route 也会变，只在还停留在本页时加载，避免多发一次请求
watch(() => (route.name === 'details' ? route.fullPath : null), (p) => { if (p) load(); }, { immediate: true });

const pageCount = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / PAGE_SIZE)));

/** 地址栏里的分组可能不在列表中（比如只有一个页面的分组），补进去让下拉框能显示它 */
const groupOptions = computed(() => {
  const groups = data.value?.groups ?? [];
  const g = filters.value.group;
  return g && !groups.some((x) => x.prefix === g) ? [...groups, { prefix: g, count: data.value?.total ?? 0 }] : groups;
});

/** 只看一个站点时，站点列每行都一样，不显示 */
const columns = computed(() => {
  const cols: Array<{ key: PageStatsSort; label: string; num: boolean; hint?: string }> = [
    { key: 'path', label: t('details.page'), num: false },
    { key: 'range_pv', label: t('stats.rangePv'), num: true },
    { key: 'range_uv', label: t('stats.rangeUv'), num: true, hint: t('details.rangeUvHint') },
    { key: 'pv', label: t('stats.totalPv'), num: true },
    { key: 'uv', label: t('stats.totalUv'), num: true },
    { key: 'first_seen', label: t('details.firstSeen'), num: true },
    { key: 'last_seen', label: t('details.lastSeen'), num: true },
  ];
  if (!filters.value.site) cols.splice(1, 0, { key: 'site', label: t('details.site'), num: false });
  return cols;
});

function sortBy(key: PageStatsSort) {
  const f = filters.value;
  if (f.sort === key) update({ dir: f.dir === 'asc' ? 'desc' : 'asc' });
  else update({ sort: key, dir: key === 'path' || key === 'site' ? 'asc' : 'desc' });
}
function ariaSort(key: PageStatsSort) {
  if (filters.value.sort !== key) return 'none';
  return filters.value.dir === 'asc' ? 'ascending' : 'descending';
}
</script>

<template>
  <PageHeader :title="t('details.title')" />

  <div class="content">
    <div class="toolbar">
      <select v-model="siteModel" class="select site">
        <option value="">{{ t('details.allSites') }}</option>
        <option v-for="s in sites" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <SegmentedControl v-model="rangeModel" :options="rangeOptions" />
      <div v-if="filters.range === 'custom'" class="custom">
        <input v-model="fromInput" class="input" type="date" />
        <span class="muted">{{ t('site.to') }}</span>
        <input v-model="toInput" class="input" type="date" />
        <button class="btn" @click="update({ from: fromInput, to: toInput })">{{ t('site.apply') }}</button>
      </div>
      <input v-model="qInput" class="input search" type="search" :placeholder="t('details.searchPlaceholder')" />
      <select v-model="groupModel" class="select group">
        <option value="">{{ t('details.allGroups') }}</option>
        <option v-for="g in groupOptions" :key="g.prefix" :value="g.prefix">{{ g.prefix }} ({{ n(g.count) }})</option>
      </select>
      <span v-if="data" class="muted total">{{ t('details.total', data.total) }}</span>
    </div>

    <div class="card table-wrap" :class="{ loading }">
      <table class="tbl">
        <thead>
          <tr>
            <th v-for="col in columns" :key="col.key" :class="{ num: col.num }" :aria-sort="ariaSort(col.key)" :title="col.hint">
              <button class="sort" :class="{ active: filters.sort === col.key }" @click="sortBy(col.key)">
                {{ col.label }}<span class="arrow">{{ filters.sort === col.key ? (filters.dir === 'asc' ? '▲' : '▼') : '' }}</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody v-if="data">
          <tr v-for="p in data.rows" :key="p.site_id + p.path">
            <td class="page-cell">
              <div class="ellipsis" :title="p.title || p.path">{{ p.title || p.path }}</div>
              <div v-if="p.title" class="muted small ellipsis" :title="p.path">{{ p.path }}</div>
            </td>
            <td v-if="!filters.site" class="site-cell ellipsis text-2" :title="p.site_name">{{ p.site_name }}</td>
            <td class="num" :class="{ muted: !p.range_pv }">{{ n(p.range_pv) }}</td>
            <td class="num" :class="{ muted: !p.range_uv }">{{ n(p.range_uv) }}</td>
            <td class="num">{{ n(p.pv) }}</td>
            <td class="num">{{ n(p.uv) }}</td>
            <td class="num nowrap" :title="d(p.first_seen * 1000, 'long')">{{ d(p.first_seen * 1000, 'date') }}</td>
            <td class="num nowrap" :title="d(p.last_seen * 1000, 'long')">{{ relativeTime(p.last_seen, locale) }}</td>
          </tr>
          <tr v-if="data.rows.length === 0">
            <td :colspan="columns.length" class="muted">{{ filters.q || filters.group ? t('details.noMatch') : t('common.noData') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="data && pageCount > 1" class="pager">
      <button class="btn btn-sm" :disabled="filters.page <= 1" @click="update({ page: filters.page - 1 })">‹ {{ t('details.prev') }}</button>
      <span class="muted num">{{ t('details.pageOf', { page: filters.page, pages: pageCount }) }}</span>
      <button class="btn btn-sm" :disabled="filters.page >= pageCount" @click="update({ page: filters.page + 1 })">{{ t('details.next') }} ›</button>
    </div>
  </div>
</template>

<style scoped>
.toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.custom { display: flex; align-items: center; gap: 8px; }
.custom .input { width: 150px; }
.search { width: 240px; }
.select.site, .select.group { width: auto; min-width: 150px; max-width: 240px; }
.total { margin-left: auto; font-size: 13px; }

.table-wrap { overflow-x: auto; transition: opacity .15s; }
.table-wrap.loading { opacity: .6; }
.tbl th { white-space: nowrap; }
.sort {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 0; border: 0; background: transparent; cursor: pointer;
  color: inherit; font-weight: inherit; font-size: inherit;
}
.sort:hover, .sort.active { color: var(--text); }
.arrow { font-size: 10px; min-width: 10px; color: var(--accent); }
.page-cell { max-width: 360px; }
.site-cell { max-width: 160px; }
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.small { font-size: 12px; }
.nowrap { white-space: nowrap; }

.pager { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; }
</style>
