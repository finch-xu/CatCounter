<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { api } from '../api';
import Modal from '../components/Modal.vue';
import SegmentedControl from '../components/SegmentedControl.vue';
import { useAuth } from '../composables/useAuth';
import { useTheme, type Theme } from '../composables/useTheme';
import { LOCALES, type Locale } from '../i18n';
import logo from '../assets/logo.png';

defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();
const tab = ref<'appearance' | 'account' | 'about'>('appearance');
const { theme } = useTheme();
const { setAuthed } = useAuth();
const { t, locale } = useI18n();
const router = useRouter();
const version = __APP_VERSION__;

const themeOptions = computed<Array<{ label: string; value: Theme }>>(() => [
  { label: t('settings.themeSystem'), value: 'system' },
  { label: t('settings.themeLight'), value: 'light' },
  { label: t('settings.themeDark'), value: 'dark' },
]);
const localeOptions = LOCALES.map((l) => ({ label: l.label, value: l.value }));
const currentLocale = computed<Locale>({
  get: () => locale.value as Locale,
  set: (v) => { locale.value = v; },
});

async function logout() {
  try { await api.logout(); } catch { /* 即使失败也清理本地状态 */ }
  setAuthed(false);
  emit('close');
  router.replace({ name: 'login' });
}
</script>

<template>
  <Modal :open="open" :title="t('settings.title')" height="420px" @close="emit('close')">
    <template #nav>
      <button class="modal-nav" :class="{ active: tab === 'appearance' }" @click="tab = 'appearance'">{{ t('settings.tabAppearance') }}</button>
      <button class="modal-nav" :class="{ active: tab === 'account' }" @click="tab = 'account'">{{ t('settings.tabAccount') }}</button>
      <button class="modal-nav" :class="{ active: tab === 'about' }" @click="tab = 'about'">{{ t('settings.tabAbout') }}</button>
    </template>

    <div v-if="tab === 'appearance'">
      <div class="field">
        <label>{{ t('settings.theme') }}</label>
        <SegmentedControl v-model="theme" :options="themeOptions" />
      </div>
      <div class="field">
        <label>{{ t('settings.language') }}</label>
        <SegmentedControl v-model="currentLocale" :options="localeOptions" />
      </div>
    </div>

    <div v-else-if="tab === 'account'">
      <i18n-t keypath="settings.accountHint" tag="p" class="text-2">
        <template #secret><code>ADMIN_PASSWORD</code></template>
      </i18n-t>
      <button class="btn" @click="logout">{{ t('settings.logout') }}</button>
    </div>

    <div v-else class="about">
      <img class="about-logo" :src="logo" alt="CatCounter logo" />
      <p><b>CatCounter</b></p>
      <p class="text-2">{{ t('settings.aboutDescription') }}</p>
      <i18n-t keypath="settings.source" tag="p" class="text-2">
        <template #link>
          <a href="https://github.com/finch-xu/CatCounter" target="_blank" rel="noopener noreferrer">github.com/finch-xu/CatCounter</a>
        </template>
      </i18n-t>
      <p class="text-2">{{ t('settings.version', { version }) }}</p>
    </div>
  </Modal>
</template>

<style scoped>
.about { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; padding-top: 8px; }
.about-logo { width: 96px; height: 96px; object-fit: contain; margin-bottom: 4px; }
.about p { margin: 0; }
</style>
