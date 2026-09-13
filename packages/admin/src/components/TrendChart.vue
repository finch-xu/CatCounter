<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { DayPoint } from '@catcounter/shared';
import { useTheme } from '../composables/useTheme';

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

const props = defineProps<{ series: DayPoint[]; height?: number }>();
const el = ref<HTMLDivElement | null>(null);
let chart: ReturnType<typeof echarts.init> | null = null;
let ro: ResizeObserver | null = null;
const { theme } = useTheme();

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function render() {
  if (!chart) return;
  const accent = cssVar('--accent');
  const text2 = cssVar('--text-2');
  const border = cssVar('--border');
  chart.setOption({
    animationDuration: 300,
    grid: { left: 40, right: 16, top: 32, bottom: 28 },
    legend: { top: 0, right: 0, textStyle: { color: text2 }, icon: 'circle' },
    tooltip: { trigger: 'axis', backgroundColor: cssVar('--panel'), borderColor: border, textStyle: { color: cssVar('--text') } },
    xAxis: {
      type: 'category', boundaryGap: false,
      data: props.series.map((p) => p.day.slice(5)),
      axisLine: { lineStyle: { color: border } }, axisLabel: { color: text2 }, axisTick: { show: false },
    },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: border } }, axisLabel: { color: text2 } },
    series: [
      { name: 'PV', type: 'line', smooth: true, symbol: 'none', data: props.series.map((p) => p.pv),
        lineStyle: { color: accent, width: 2 }, itemStyle: { color: accent },
        areaStyle: { color: accent, opacity: 0.08 } },
      { name: 'UV', type: 'line', smooth: true, symbol: 'none', data: props.series.map((p) => p.uv),
        lineStyle: { color: text2, width: 2, type: 'dashed' }, itemStyle: { color: text2 } },
    ],
  }, true);
}

onMounted(() => {
  if (!el.value) return;
  chart = echarts.init(el.value);
  render();
  ro = new ResizeObserver(() => chart?.resize());
  ro.observe(el.value);
});
onBeforeUnmount(() => {
  ro?.disconnect();
  chart?.dispose();
  chart = null;
});
watch(() => props.series, render, { deep: true });
watch(theme, () => setTimeout(render, 0));
</script>

<template>
  <div ref="el" :style="{ height: (height ?? 260) + 'px', width: '100%' }" />
</template>
