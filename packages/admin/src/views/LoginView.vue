<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api';
import { useAuth } from '../composables/useAuth';
import { LOCALES } from '../i18n';
import logo from '../assets/logo.png';

const password = ref('');
const error = ref('');
const busy = ref(false);
const router = useRouter();
const route = useRoute();
const { setAuthed } = useAuth();
const { t, locale } = useI18n();

async function submit() {
  error.value = '';
  busy.value = true;
  try {
    await api.login(password.value);
    setAuthed(true);
    const next = typeof route.query.next === 'string' ? route.query.next : '/';
    router.replace(next);
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('login.failed');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="login">
    <select v-model="locale" class="select lang" :aria-label="t('settings.language')">
      <option v-for="l in LOCALES" :key="l.value" :value="l.value">{{ l.label }}</option>
    </select>
    <form class="card box" @submit.prevent="submit">
      <div class="brand"><img class="logo" :src="logo" alt="" /><span class="name">CatCounter</span></div>
      <p class="text-2">{{ t('login.subtitle') }}</p>
      <div class="field">
        <input v-model="password" class="input" type="password" :placeholder="t('login.password')" autofocus />
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <button class="btn btn-primary full" :disabled="busy || !password">{{ t('login.submit') }}</button>
    </form>
  </div>
</template>

<style scoped>
.login { position: relative; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
.lang { position: absolute; top: 20px; right: 20px; width: auto; height: 32px; font-size: 13px; }
.box { width: 360px; padding: 28px; }
.brand { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.logo { width: 36px; height: 36px; object-fit: contain; }
.name { font-family: var(--font-serif); font-size: 22px; }
.full { width: 100%; justify-content: center; }
</style>
