<script setup lang="ts" generic="T extends string">
defineProps<{ options: Array<{ label: string; value: T }>; modelValue: T }>();
defineEmits<{ 'update:modelValue': [value: T] }>();
</script>

<template>
  <div class="seg">
    <button
      v-for="o in options" :key="o.value" class="seg-item" :class="{ active: o.value === modelValue }"
      @click="$emit('update:modelValue', o.value)"
    >{{ o.label }}</button>
  </div>
</template>

<style scoped>
.seg { display: inline-flex; padding: 3px; border: 1px solid var(--border); border-radius: 8px; background: var(--panel); }
.seg-item { border: 0; background: transparent; padding: 4px 12px; border-radius: 6px; cursor: pointer; color: var(--text-2); }
.seg-item.active { background: var(--accent-soft); color: var(--accent); }
</style>
