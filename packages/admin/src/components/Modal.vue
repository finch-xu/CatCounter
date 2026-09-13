<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
defineProps<{ open: boolean; title: string; wide?: boolean }>();
const emit = defineEmits<{ close: [] }>();
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close');
}
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="overlay" @click.self="emit('close')">
      <div class="dialog card" :class="{ wide }">
        <aside v-if="$slots.nav" class="nav"><slot name="nav" /></aside>
        <section class="body">
          <header class="head">
            <h2 class="title">{{ title }}</h2>
            <button class="btn btn-ghost btn-sm" @click="emit('close')">✕</button>
          </header>
          <div class="content"><slot /></div>
        </section>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: grid; place-items: center; z-index: 50; padding: 24px; }
.dialog { display: flex; width: min(720px, 100%); max-height: 85vh; overflow: hidden; box-shadow: var(--shadow-modal); }
.dialog.wide { width: min(1000px, 100%); }
.nav { width: 200px; flex: 0 0 auto; border-right: 1px solid var(--border); padding: 16px 12px; background: var(--bg); }
.body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); }
.title { font-size: 16px; }
.content { padding: 20px; overflow-y: auto; }
</style>
