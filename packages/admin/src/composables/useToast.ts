import { ref } from 'vue';

export interface ToastItem { id: number; text: string; kind: 'info' | 'error' }
const toasts = ref<ToastItem[]>([]);
let seq = 0;

export function useToast() {
  function toast(text: string, kind: ToastItem['kind'] = 'info') {
    const id = ++seq;
    toasts.value.push({ id, text, kind });
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id);
    }, 3000);
  }
  return { toasts, toast };
}
