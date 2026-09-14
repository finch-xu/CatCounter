<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Site, Token } from '@catcounter/shared';
import { api } from '../api';
import Modal from '../components/Modal.vue';
import { useToast } from '../composables/useToast';
import { copyText, snippetFor } from '../utils/snippet';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; created: [site: Site] }>();
const { toast } = useToast();
const { t } = useI18n();

const name = ref('');
const originsText = ref('');
const error = ref('');
const busy = ref(false);
const result = ref<{ site: Site; token: Token } | null>(null);

watch(() => props.open, (o) => {
  if (o) { name.value = ''; originsText.value = ''; error.value = ''; result.value = null; }
});

async function submit() {
  error.value = '';
  const origins = originsText.value.split('\n').map((s) => s.trim()).filter(Boolean);
  busy.value = true;
  try {
    result.value = await api.createSite({ name: name.value.trim(), origins });
    emit('created', result.value.site);
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('newSite.createFailed');
  } finally {
    busy.value = false;
  }
}

async function copy() {
  if (!result.value) return;
  if (await copyText(snippetFor(result.value.token.token))) toast(t('common.copied'));
  else toast(t('common.copyFailed'), 'error');
}
</script>

<template>
  <Modal :open="open" :title="t('newSite.title')" @close="emit('close')">
    <template v-if="!result">
      <div class="field">
        <label>{{ t('common.siteName') }}</label>
        <input v-model="name" class="input" :placeholder="t('newSite.namePlaceholder')" />
      </div>
      <div class="field">
        <label>{{ t('common.allowedOrigins') }}</label>
        <textarea v-model="originsText" class="textarea" placeholder="https://blog.example.com&#10;http://localhost:4000" />
        <div class="hint">{{ t('newSite.originsHint') }}</div>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <div class="row">
        <button class="btn" @click="emit('close')">{{ t('common.cancel') }}</button>
        <button class="btn btn-primary" :disabled="busy || !name.trim() || !originsText.trim()" @click="submit">{{ t('common.create') }}</button>
      </div>
    </template>
    <template v-else>
      <i18n-t keypath="newSite.created" tag="p">
        <template #name><b>{{ result.site.name }}</b></template>
      </i18n-t>
      <code class="snippet">{{ snippetFor(result.token.token) }}</code>
      <div class="row">
        <button class="btn" @click="copy">{{ t('common.copyCode') }}</button>
        <button class="btn btn-primary" @click="emit('close')">{{ t('common.done') }}</button>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
.row { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
</style>
