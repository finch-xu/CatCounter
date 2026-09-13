<script setup lang="ts">
import { onMounted, ref } from 'vue';
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
const data = ref<Overview | null>(null);
const showNew = ref(false);

async function load() {
  try {
    data.value = await reload();
  } catch (e) {
    toast(e instanceof Error ? e.message : '加载失败', 'error');
  }
}
onMounted(load);
</script>

<template>
  <PageHeader title="总览">
    <template #actions>
      <button class="btn btn-primary" @click="showNew = true">+ 新建站点</button>
    </template>
  </PageHeader>

  <div v-if="data" class="content">
    <div class="grid-stats">
      <StatTile label="站点" :value="data.totals.sites" />
      <StatTile label="今日 PV" :value="data.totals.today.pv" :sub="`UV ${data.totals.today.uv}`" />
      <StatTile label="累计 PV" :value="data.totals.all.pv" />
      <StatTile label="累计 UV" :value="data.totals.all.uv" />
    </div>

    <div class="section-title">近 30 天（全部站点）</div>
    <div class="card card-pad"><TrendChart :series="data.series" /></div>

    <div class="section-title">站点</div>
    <div class="card">
      <table class="tbl">
        <thead>
          <tr><th>名称</th><th class="num">今日 PV</th><th class="num">今日 UV</th><th class="num">累计 PV</th><th class="num">累计 UV</th></tr>
        </thead>
        <tbody>
          <tr v-for="s in data.sites" :key="s.id" class="clickable" @click="router.push({ name: 'site', params: { id: s.id } })">
            <td>{{ s.name }}<div class="muted small">{{ s.origins.join('、') }}</div></td>
            <td class="num">{{ s.today.pv }}</td>
            <td class="num">{{ s.today.uv }}</td>
            <td class="num">{{ s.pv.toLocaleString('zh-CN') }}</td>
            <td class="num">{{ s.uv.toLocaleString('zh-CN') }}</td>
          </tr>
          <tr v-if="data.sites.length === 0"><td colspan="5" class="muted">还没有站点，点击右上角新建。</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <NewSiteModal :open="showNew" @close="showNew = false" @created="load" />
</template>

<style scoped>
.small { font-size: 12px; }
</style>
