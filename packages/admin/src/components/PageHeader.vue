<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<template>
  <header class="page-header">
    <h1 class="title">{{ title }}</h1>
    <div class="actions"><slot name="actions" /></div>
  </header>
</template>

<style scoped>
.page-header {
  height: var(--header-h); display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px; background: var(--panel); border-bottom: 1px solid var(--border);
  position: sticky; top: 0; z-index: 5;
}
.title { font-size: 16px; }
.actions { display: flex; gap: 8px; }
</style>
