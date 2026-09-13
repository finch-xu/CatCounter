import { ref } from 'vue';
import { api } from '../api';

const authed = ref<boolean | null>(null);

export function useAuth() {
  async function check(): Promise<boolean> {
    if (authed.value !== null) return authed.value;
    try {
      await api.me();
      authed.value = true;
    } catch {
      authed.value = false;
    }
    return authed.value;
  }
  function setAuthed(v: boolean) {
    authed.value = v;
  }
  return { authed, check, setAuthed };
}
