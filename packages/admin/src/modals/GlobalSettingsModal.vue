<script setup lang="ts">
import Modal from '../components/Modal.vue';
defineProps<{ open: boolean }>();
defineEmits<{ close: [] }>();
</script>

<template>
  <Modal :open="open" title="设置" @close="$emit('close')">
    <p class="muted">设置项将在后续任务中补充。</p>
  </Modal>
</template>
