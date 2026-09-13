import { ref } from 'vue';
import type { SiteSummary } from '@catcounter/shared';
import { api } from '../api';

const sites = ref<SiteSummary[]>([]);
const loaded = ref(false);

export function useSites() {
  async function reload() {
    const ov = await api.overview();
    sites.value = ov.sites;
    loaded.value = true;
    return ov;
  }
  return { sites, loaded, reload };
}
