<script setup lang="ts">
defineProps<{ label: string; value: number; sub?: string }>();
</script>

<template>
  <div class="card tile">
    <div class="value num">{{ value.toLocaleString('zh-CN') }}</div>
    <div class="label">{{ label }}</div>
    <div v-if="sub" class="muted sub">{{ sub }}</div>
  </div>
</template>

<style scoped>
.tile { padding: 18px 20px; }
.value { font-size: 26px; font-weight: 600; line-height: 1.2; }
.label { color: var(--text-2); font-size: 13px; margin-top: 4px; }
.sub { font-size: 12px; margin-top: 2px; }
</style>
