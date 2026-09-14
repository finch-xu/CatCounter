<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import type { Overview } from '@catcounter/shared';
import PageHeader from '../components/PageHeader.vue';
import StatTile from '../components/StatTile.vue';
import TrendChart from '../components/TrendChart.vue';
import NewSiteModal from '../modals/NewSiteModal.vue';
import { useSites } from '../composables/useSites';
import { useToast } from '../composables/useToast';

const router = useRouter();
const { reload } = useSites();
const { toast } = useToast();
const { t, n } = useI18n();
const data = ref<Overview | null>(null);
const showNew = ref(false);

async function load() {
  try {
    data.value = await reload();
  } catch (e) {
    toast(e instanceof Error ? e.message : t('common.loadFailed'), 'error');
  }
}
onMounted(load);
</script>

<template>
  <PageHeader :title="t('overview.title')">
    <template #actions>
      <button class="btn btn-primary" @click="showNew = true">{{ t('overview.newSite') }}</button>
    </template>
  </PageHeader>

  <div v-if="data" class="content">
    <div class="grid-stats">
      <StatTile :label="t('stats.sites')" :value="data.totals.sites" />
      <StatTile :label="t('stats.todayPv')" :value="data.totals.today.pv" />
      <StatTile :label="t('stats.todayUv')" :value="data.totals.today.uv" />
      <StatTile :label="t('stats.totalPv')" :value="data.totals.all.pv" />
      <StatTile :label="t('stats.totalUv')" :value="data.totals.all.uv" />
    </div>

    <div class="section-title">{{ t('overview.last30Days') }}</div>
    <div class="card card-pad"><TrendChart :series="data.series" /></div>

    <div class="section-title">{{ t('overview.sites') }}</div>
    <div class="card">
      <table class="tbl">
        <thead>
          <tr>
            <th>{{ t('common.name') }}</th>
            <th class="num">{{ t('stats.todayPv') }}</th>
            <th class="num">{{ t('stats.todayUv') }}</th>
            <th class="num">{{ t('stats.totalPv') }}</th>
            <th class="num">{{ t('stats.totalUv') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in data.sites" :key="s.id" class="clickable" @click="router.push({ name: 'site', params: { id: s.id } })">
            <td>{{ s.name }}<div class="muted small">{{ s.origins.join(t('common.listSeparator')) }}</div></td>
            <td class="num">{{ n(s.today.pv) }}</td>
            <td class="num">{{ n(s.today.uv) }}</td>
            <td class="num">{{ n(s.pv) }}</td>
            <td class="num">{{ n(s.uv) }}</td>
          </tr>
          <tr v-if="data.sites.length === 0"><td colspan="5" class="muted">{{ t('overview.empty') }}</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <NewSiteModal :open="showNew" @close="showNew = false" @created="load" />
</template>

<style scoped>
.small { font-size: 12px; }
</style>
