<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import type { Site, SiteStats } from '@catcounter/shared';
import BarList from '../components/BarList.vue';
import PageHeader from '../components/PageHeader.vue';
import SegmentedControl from '../components/SegmentedControl.vue';
import StatTile from '../components/StatTile.vue';
import TrendChart from '../components/TrendChart.vue';
import SiteSettingsModal from '../modals/SiteSettingsModal.vue';
import { api } from '../api';
import { presetDates, useRangeOptions, type Range } from '../composables/useDateRange';
import { useSites } from '../composables/useSites';
import { useToast } from '../composables/useToast';

const props = defineProps<{ id: string }>();
const router = useRouter();
const { reload } = useSites();
const { toast } = useToast();
const { t, n } = useI18n();
const rangeOptions = useRangeOptions();

const range = ref<Range>('30');
const from = ref('');
const to = ref('');
const site = ref<Site | null>(null);
const stats = ref<SiteStats | null>(null);
const showSettings = ref(false);

const deviceLabels = computed<Record<string, string>>(() => ({
  desktop: t('site.deviceDesktop'), mobile: t('site.deviceMobile'), tablet: t('site.deviceTablet'),
}));
const referrerLabels = computed<Record<string, string>>(() => ({ direct: t('site.referrerDirect') }));

function applyRange() {
  if (range.value === 'custom') return;
  const d = presetDates(range.value);
  from.value = d.from;
  to.value = d.to;
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
    toast(e instanceof Error ? e.message : t('common.loadFailed'), 'error');
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
  toast(t('site.deleted'));
  router.replace({ name: 'overview' });
}
</script>

<template>
  <PageHeader :title="site?.name ?? t('site.fallbackTitle')">
    <template #actions>
      <button class="btn" :disabled="!site" @click="showSettings = true">{{ t('common.settings') }}</button>
    </template>
  </PageHeader>

  <div v-if="site && stats" class="content">
    <div class="toolbar">
      <SegmentedControl v-model="range" :options="rangeOptions" />
      <div v-if="range === 'custom'" class="custom">
        <input v-model="from" class="input" type="date" />
        <span class="muted">{{ t('site.to') }}</span>
        <input v-model="to" class="input" type="date" />
        <button class="btn" @click="load">{{ t('site.apply') }}</button>
      </div>
    </div>

    <div class="grid-stats">
      <StatTile :label="t('stats.rangePv')" :value="rangeTotals.pv" />
      <StatTile :label="t('stats.rangeUv')" :value="rangeTotals.uv" />
      <StatTile :label="t('stats.totalPv')" :value="site.pv" />
      <StatTile :label="t('stats.totalUv')" :value="site.uv" />
    </div>

    <div class="section-title">{{ t('site.trend') }}</div>
    <div class="card card-pad"><TrendChart :series="stats.series" /></div>

    <div class="section-title">{{ t('site.details') }}</div>
    <div class="grid-3">
      <div class="card">
        <table class="tbl">
          <thead><tr><th>{{ t('site.topPages') }}</th><th class="num">PV</th><th class="num">UV</th></tr></thead>
          <tbody>
            <tr v-for="p in stats.pages" :key="p.path">
              <td>
                <div class="ellipsis" :title="p.path">{{ p.title || p.path }}</div>
                <div class="muted small ellipsis">{{ p.path }}</div>
              </td>
              <td class="num">{{ n(p.pv) }}</td>
              <td class="num">{{ n(p.uv) }}</td>
            </tr>
            <tr v-if="stats.pages.length === 0"><td colspan="3" class="muted">{{ t('common.noData') }}</td></tr>
          </tbody>
        </table>
      </div>
      <BarList :title="t('site.referrers')" :items="stats.referrers" :labels="referrerLabels" />
      <div class="stack">
        <BarList :title="t('site.countries')" :items="stats.countries" />
        <BarList :title="t('site.devices')" :items="stats.devices" :labels="deviceLabels" />
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
