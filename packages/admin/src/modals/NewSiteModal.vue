<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Site, Token } from '@catcounter/shared';
import { api } from '../api';
import Modal from '../components/Modal.vue';
import { useToast } from '../composables/useToast';
import { copyText, snippetFor } from '../utils/snippet';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; created: [site: Site] }>();
const { toast } = useToast();

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
    error.value = e instanceof Error ? e.message : '创建失败';
  } finally {
    busy.value = false;
  }
}

async function copy() {
  if (!result.value) return;
  if (await copyText(snippetFor(result.value.token.token))) toast('已复制接入代码');
  else toast('复制失败，请手动选择代码复制', 'error');
}
</script>

<template>
  <Modal :open="open" title="新建站点" @close="emit('close')">
    <template v-if="!result">
      <div class="field">
        <label>站点名称</label>
        <input v-model="name" class="input" placeholder="我的博客" />
      </div>
      <div class="field">
        <label>允许的 Origin（每行一个）</label>
        <textarea v-model="originsText" class="textarea" placeholder="https://blog.example.com&#10;http://localhost:4000" />
        <div class="hint">只有来自这些 Origin 的页面才会被计数。本地预览时把 http://localhost:4000 也加上。</div>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <div class="row">
        <button class="btn" @click="emit('close')">取消</button>
        <button class="btn btn-primary" :disabled="busy || !name.trim() || !originsText.trim()" @click="submit">创建</button>
      </div>
    </template>
    <template v-else>
      <p>站点 <b>{{ result.site.name }}</b> 已创建。把下面的代码加到主题模板里：</p>
      <code class="snippet">{{ snippetFor(result.token.token) }}</code>
      <div class="row">
        <button class="btn" @click="copy">复制代码</button>
        <button class="btn btn-primary" @click="emit('close')">完成</button>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
.row { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
</style>
