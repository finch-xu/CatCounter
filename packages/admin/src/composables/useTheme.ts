import { ref, watchEffect } from 'vue';

export type Theme = 'system' | 'light' | 'dark';
const KEY = 'cc-theme';

function load(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

const theme = ref<Theme>(load());

watchEffect(() => {
  const root = document.documentElement;
  if (theme.value === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme.value);
  try {
    localStorage.setItem(KEY, theme.value);
  } catch {
    // 忽略
  }
});

export function useTheme() {
  return { theme };
}
