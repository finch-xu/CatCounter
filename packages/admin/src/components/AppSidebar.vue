<script setup lang="ts">
import type { SiteSummary } from '@catcounter/shared';
defineProps<{ sites: SiteSummary[] }>();
defineEmits<{ 'open-settings': [] }>();
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <span class="dot" />
      <span class="name">CatCounter</span>
    </div>
    <nav class="nav">
      <router-link :to="{ name: 'overview' }" class="nav-item" exact-active-class="active">
        <span>总览</span>
      </router-link>
      <div class="nav-group">站点</div>
      <router-link
        v-for="s in sites" :key="s.id"
        :to="{ name: 'site', params: { id: s.id } }" class="nav-item" active-class="active"
      >
        <span class="ellipsis">{{ s.name }}</span>
        <span class="badge num">{{ s.today.pv }}</span>
      </router-link>
      <p v-if="sites.length === 0" class="muted empty">还没有站点</p>
    </nav>
    <div class="footer">
      <div class="avatar">管</div>
      <div class="who">
        <div>管理员</div>
        <div class="muted small">CatCounter</div>
      </div>
      <button class="btn btn-ghost btn-sm" title="设置" @click="$emit('open-settings')">⚙</button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-w); flex: 0 0 auto; position: sticky; top: 0; height: 100vh;
  display: flex; flex-direction: column;
  background: var(--panel); border-right: 1px solid var(--border);
}
.brand { display: flex; align-items: center; gap: 10px; padding: 20px 20px 12px; }
.dot { width: 22px; height: 22px; border-radius: 50%; background: var(--accent); }
.name { font-family: var(--font-serif); font-size: 20px; }
.nav { flex: 1; padding: 8px 12px; overflow-y: auto; }
.nav-group { font-size: 12px; color: var(--text-3); padding: 16px 8px 6px; }
.nav-item {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 8px 10px; border-radius: 8px; color: var(--text-2);
}
.nav-item:hover { background: var(--bg); }
.nav-item.active { background: var(--accent-soft); color: var(--accent); }
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty { padding: 6px 10px; font-size: 13px; }
.footer { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-top: 1px solid var(--border); }
.avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; font-size: 13px; }
.who { flex: 1; line-height: 1.2; }
.small { font-size: 12px; }
</style>
