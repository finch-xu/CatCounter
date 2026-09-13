<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api';
import Modal from '../components/Modal.vue';
import SegmentedControl from '../components/SegmentedControl.vue';
import { useAuth } from '../composables/useAuth';
import { useTheme, type Theme } from '../composables/useTheme';

defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();
const tab = ref<'appearance' | 'account' | 'about'>('appearance');
const { theme } = useTheme();
const { setAuthed } = useAuth();
const router = useRouter();

const themeOptions: Array<{ label: string; value: Theme }> = [
  { label: '跟随系统', value: 'system' },
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
];

async function logout() {
  try { await api.logout(); } catch { /* 即使失败也清理本地状态 */ }
  setAuthed(false);
  emit('close');
  router.replace({ name: 'login' });
}
</script>

<template>
  <Modal :open="open" title="设置" @close="emit('close')">
    <template #nav>
      <button class="modal-nav" :class="{ active: tab === 'appearance' }" @click="tab = 'appearance'">外观</button>
      <button class="modal-nav" :class="{ active: tab === 'account' }" @click="tab = 'account'">账户</button>
      <button class="modal-nav" :class="{ active: tab === 'about' }" @click="tab = 'about'">关于</button>
    </template>

    <div v-if="tab === 'appearance'">
      <div class="field">
        <label>主题</label>
        <SegmentedControl v-model="theme" :options="themeOptions" />
      </div>
    </div>

    <div v-else-if="tab === 'account'">
      <p class="text-2">当前以管理员身份登录。修改密码请在 Cloudflare 控制台更新 <code>ADMIN_PASSWORD</code> 后重新部署。</p>
      <button class="btn" @click="logout">退出登录</button>
    </div>

    <div v-else>
      <p><b>CatCounter</b></p>
      <p class="text-2">部署在 Cloudflare Workers 上的博客访问量统计，数据存于 D1。</p>
      <p class="text-2">源码：<a href="https://github.com/finchxu/CatCounter" target="_blank" rel="noopener">github.com/finchxu/CatCounter</a></p>
    </div>
  </Modal>
</template>
