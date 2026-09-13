<script setup lang="ts">
import PageHeader from '../components/PageHeader.vue';
defineProps<{ id: string }>();
</script>
<template>
  <PageHeader title="站点" />
  <div class="content"><p class="muted">站点 {{ id }} 详情将在后续任务实现。</p></div>
</template>
