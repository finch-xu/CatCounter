<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { Site, SiteStats } from '@catcounter/shared';
import BarList from '../components/BarList.vue';
import PageHeader from '../components/PageHeader.vue';
import SegmentedControl from '../components/SegmentedControl.vue';
import StatTile from '../components/StatTile.vue';
import TrendChart from '../components/TrendChart.vue';
import SiteSettingsModal from '../modals/SiteSettingsModal.vue';
import { api } from '../api';
import { useSites } from '../composables/useSites';
import { useToast } from '../composables/useToast';

const props = defineProps<{ id: string }>();
const router = useRouter();
const { reload } = useSites();
const { toast } = useToast();

type Range = '7' | '30' | '90' | 'custom';
const range = ref<Range>('30');
const from = ref('');
const to = ref('');
const site = ref<Site | null>(null);
const stats = ref<SiteStats | null>(null);
const showSettings = ref(false);

const DEVICE_LABELS: Record<string, string> = { desktop: '桌面', mobile: '手机', tablet: '平板' };
const REFERRER_LABELS: Record<string, string> = { direct: '直接访问' };

function dayStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function applyRange() {
  if (range.value === 'custom') return;
  const today = new Date();
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (Number(range.value) - 1));
  from.value = dayStr(start);
  to.value = dayStr(today);
}

const rangeTotals = computed(() => {
  const s = stats.value?.series ?? [];
  return s.reduce((a, p) => ({ pv: a.pv + p.pv, uv: a.uv + p.uv }), { pv: 0, uv: 0 });
});

async function load() {
  try {
    site.value = await api.site(props.id);
    stats.value = await api.stats(props.id, from.value, to.value);
  } catch (e) {
    toast(e instanceof Error ? e.message : '加载失败', 'error');
  }
}

onMounted(() => { applyRange(); load(); });
watch(range, () => { applyRange(); if (range.value !== 'custom') load(); });
watch(() => props.id, () => { applyRange(); load(); });

function onUpdated(s: Site) {
  site.value = s;
  reload().catch(() => undefined);
}
async function onDeleted() {
  showSettings.value = false;
  await reload().catch(() => undefined);
  toast('站点已删除');
  router.replace({ name: 'overview' });
}
</script>

<template>
  <PageHeader :title="site?.name ?? '站点'">
    <template #actions>
      <button class="btn" :disabled="!site" @click="showSettings = true">设置</button>
    </template>
  </PageHeader>

  <div v-if="site && stats" class="content">
    <div class="toolbar">
      <SegmentedControl
        v-model="range"
        :options="[{ label: '7 天', value: '7' }, { label: '30 天', value: '30' }, { label: '90 天', value: '90' }, { label: '自定义', value: 'custom' }]"
      />
      <div v-if="range === 'custom'" class="custom">
        <input v-model="from" class="input" type="date" />
        <span class="muted">至</span>
        <input v-model="to" class="input" type="date" />
        <button class="btn" @click="load">查询</button>
      </div>
    </div>

    <div class="grid-stats">
      <StatTile label="区间 PV" :value="rangeTotals.pv" />
      <StatTile label="区间 UV" :value="rangeTotals.uv" />
      <StatTile label="累计 PV" :value="site.pv" />
      <StatTile label="累计 UV" :value="site.uv" />
    </div>

    <div class="section-title">趋势</div>
    <div class="card card-pad"><TrendChart :series="stats.series" /></div>

    <div class="section-title">明细</div>
    <div class="grid-3">
      <div class="card">
        <table class="tbl">
          <thead><tr><th>热门页面</th><th class="num">PV</th><th class="num">UV</th></tr></thead>
          <tbody>
            <tr v-for="p in stats.pages" :key="p.path">
              <td>
                <div class="ellipsis" :title="p.path">{{ p.title || p.path }}</div>
                <div class="muted small ellipsis">{{ p.path }}</div>
              </td>
              <td class="num">{{ p.pv }}</td>
              <td class="num">{{ p.uv }}</td>
            </tr>
            <tr v-if="stats.pages.length === 0"><td colspan="3" class="muted">暂无数据</td></tr>
          </tbody>
        </table>
      </div>
      <BarList title="来源" :items="stats.referrers" :labels="REFERRER_LABELS" />
      <div class="stack">
        <BarList title="地区" :items="stats.countries" />
        <BarList title="设备" :items="stats.devices" :labels="DEVICE_LABELS" />
      </div>
    </div>
  </div>

  <SiteSettingsModal v-if="site" :open="showSettings" :site="site" @close="showSettings = false" @updated="onUpdated" @deleted="onDeleted" />
</template>

<style scoped>
.toolbar { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.custom { display: flex; align-items: center; gap: 8px; }
.custom .input { width: 150px; }
.stack { display: flex; flex-direction: column; gap: 16px; }
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 260px; }
.small { font-size: 12px; }
</style>
