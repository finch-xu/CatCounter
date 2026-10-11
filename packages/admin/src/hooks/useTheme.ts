import { useSyncExternalStore } from 'react';

export type Theme = 'system' | 'light' | 'dark';
const KEY = 'cc-theme';

export function loadTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

let current: Theme = loadTheme();
const listeners = new Set<() => void>();

function apply(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

export function setTheme(theme: Theme): void {
  current = theme;
  apply(theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // 忽略
  }
  listeners.forEach((fn) => fn());
}

const media = () => (typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null);

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  const m = media();
  m?.addEventListener('change', fn);
  return () => {
    listeners.delete(fn);
    m?.removeEventListener('change', fn);
  };
}

const resolve = (t: Theme): 'light' | 'dark' => (t === 'system' ? (media()?.matches ? 'dark' : 'light') : t);

apply(current);

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current);
  const resolved = useSyncExternalStore(subscribe, () => resolve(current));
  return {
    theme,
    resolved,
    setTheme,
    /** 页头的快捷按钮：在当前实际显示的深浅色之间切换 */
    toggle: () => setTheme(resolved === 'dark' ? 'light' : 'dark'),
  };
}
