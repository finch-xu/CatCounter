<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppSidebar from './components/AppSidebar.vue';
import ToastHost from './components/ToastHost.vue';
import GlobalSettingsModal from './modals/GlobalSettingsModal.vue';
import { useAuth } from './composables/useAuth';
import { useSites } from './composables/useSites';

const route = useRoute();
const { authed } = useAuth();
const { sites, loaded, reload } = useSites();
const showSettings = ref(false);
const isLogin = computed(() => route.name === 'login');

watch(
  () => authed.value && !isLogin.value,
  (ok) => {
    if (ok && !loaded.value) reload().catch(() => undefined);
  },
  { immediate: true },
);
</script>

<template>
  <router-view v-if="isLogin" />
  <div v-else class="layout">
    <AppSidebar :sites="sites" @open-settings="showSettings = true" />
    <main class="main">
      <router-view />
    </main>
    <GlobalSettingsModal :open="showSettings" @close="showSettings = false" />
  </div>
  <ToastHost />
</template>

<style>
.layout { display: flex; min-height: 100vh; }
.main { flex: 1; min-width: 0; }
.content { max-width: 1200px; margin: 0 auto; padding: 24px; }
</style>
