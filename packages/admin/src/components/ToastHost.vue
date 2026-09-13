<script setup lang="ts">
import { useToast } from '../composables/useToast';
const { toasts } = useToast();
</script>

<template>
  <Teleport to="body">
    <div class="toasts">
      <div v-for="t in toasts" :key="t.id" class="toast card" :class="t.kind">{{ t.text }}</div>
    </div>
  </Teleport>
</template>

<style scoped>
.toasts { position: fixed; right: 20px; bottom: 20px; display: flex; flex-direction: column; gap: 8px; z-index: 100; }
.toast { padding: 10px 14px; box-shadow: var(--shadow-modal); }
.toast.error { border-color: var(--danger); color: var(--danger); }
</style>
