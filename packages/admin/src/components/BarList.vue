<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { DimStat } from '@catcounter/shared';
const props = defineProps<{ title: string; items: DimStat[]; labels?: Record<string, string> }>();
const max = computed(() => Math.max(1, ...props.items.map((i) => i.count)));
const label = (v: string) => props.labels?.[v] ?? v;
const { t, n } = useI18n();
</script>

<template>
  <div class="card card-pad">
    <h3 class="title">{{ title }}</h3>
    <div v-if="items.length === 0" class="muted">{{ t('common.noData') }}</div>
    <div v-for="i in items" :key="i.value" class="row">
      <div class="bar" :style="{ width: (i.count / max) * 100 + '%' }" />
      <span class="label ellipsis">{{ label(i.value) }}</span>
      <span class="count num">{{ n(i.count) }}</span>
    </div>
  </div>
</template>

<style scoped>
.title { font-size: 14px; margin-bottom: 12px; }
.row { position: relative; display: flex; justify-content: space-between; align-items: center; height: 30px; padding: 0 8px; margin-bottom: 4px; border-radius: 6px; overflow: hidden; }
.bar { position: absolute; left: 0; top: 0; bottom: 0; background: var(--accent-soft); border-radius: 6px; }
.label, .count { position: relative; }
.count { color: var(--text-2); }
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
