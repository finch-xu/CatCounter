<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api';
import { useAuth } from '../composables/useAuth';
import logo from '../assets/logo.png';

const password = ref('');
const error = ref('');
const busy = ref(false);
const router = useRouter();
const route = useRoute();
const { setAuthed } = useAuth();

async function submit() {
  error.value = '';
  busy.value = true;
  try {
    await api.login(password.value);
    setAuthed(true);
    const next = typeof route.query.next === 'string' ? route.query.next : '/';
    router.replace(next);
  } catch (e) {
    error.value = e instanceof Error ? e.message : '登录失败';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="login">
    <form class="card box" @submit.prevent="submit">
      <div class="brand"><img class="logo" :src="logo" alt="" /><span class="name">CatCounter</span></div>
      <p class="text-2">输入管理员密码进入后台</p>
      <div class="field">
        <input v-model="password" class="input" type="password" placeholder="密码" autofocus />
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <button class="btn btn-primary full" :disabled="busy || !password">登录</button>
    </form>
  </div>
</template>

<style scoped>
.login { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
.box { width: 360px; padding: 28px; }
.brand { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.logo { width: 36px; height: 36px; object-fit: contain; }
.name { font-family: var(--font-serif); font-size: 22px; }
.full { width: 100%; justify-content: center; }
</style>
