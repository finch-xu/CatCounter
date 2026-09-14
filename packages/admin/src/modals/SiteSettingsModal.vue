<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PageRow, Site, Token } from '@catcounter/shared';
import { api } from '../api';
import Modal from '../components/Modal.vue';
import { useToast } from '../composables/useToast';
import { copyText, snippetFor } from '../utils/snippet';

const props = defineProps<{ open: boolean; site: Site }>();
const emit = defineEmits<{ close: []; updated: [site: Site]; deleted: [] }>();
const { toast } = useToast();
const { t, d, n } = useI18n();

type Tab = 'basic' | 'tokens' | 'counters' | 'danger';
const tab = ref<Tab>('basic');
const busy = ref(false);

// 基本信息
const name = ref('');
const originsText = ref('');
const retention = ref('');

// token
const tokens = ref<Token[]>([]);
const newTokenName = ref('');
const shownToken = ref<string | null>(null);

// 计数修正
const sitePv = ref('');
const siteUv = ref('');
const pageQuery = ref('');
const pages = ref<PageRow[]>([]);
const editPath = ref('');
const editPv = ref('');
const editUv = ref('');

// 危险区
const confirmName = ref('');

watch(() => props.open, async (o) => {
  if (!o) return;
  tab.value = 'basic';
  name.value = props.site.name;
  originsText.value = props.site.origins.join('\n');
  retention.value = props.site.retention_days ? String(props.site.retention_days) : '';
  sitePv.value = String(props.site.pv);
  siteUv.value = String(props.site.uv);
  confirmName.value = '';
  shownToken.value = null;
  await loadTokens();
});

function fail(e: unknown) {
  toast(e instanceof Error ? e.message : t('common.operationFailed'), 'error');
}

async function saveBasic() {
  busy.value = true;
  try {
    const site = await api.updateSite(props.site.id, {
      name: name.value.trim(),
      origins: originsText.value.split('\n').map((s) => s.trim()).filter(Boolean),
      retention_days: retention.value.trim() ? Number(retention.value) : null,
    });
    emit('updated', site);
    toast(t('siteSettings.saved'));
  } catch (e) { fail(e); } finally { busy.value = false; }
}

async function loadTokens() {
  try { tokens.value = await api.tokens(props.site.id); } catch (e) { fail(e); }
}
async function addToken() {
  try {
    await api.createToken(props.site.id, newTokenName.value.trim() || t('siteSettings.untitled'));
    newTokenName.value = '';
    await loadTokens();
  } catch (e) { fail(e); }
}
async function revoke(token: Token) {
  if (!confirm(t('siteSettings.revokeConfirm', { name: token.name }))) return;
  try { await api.revokeToken(props.site.id, token.id); await loadTokens(); } catch (e) { fail(e); }
}
async function copyToken(token: Token) {
  if (await copyText(snippetFor(token.token))) toast(t('common.copied'));
  else toast(t('common.copyFailed'), 'error');
}
function toggleShown(token: Token) {
  shownToken.value = shownToken.value === token.token ? null : token.token;
}
function fmt(ts: number | null): string {
  return ts ? d(ts * 1000, 'long') : t('siteSettings.never');
}

/** 空输入表示不修改该项 */
function toCounter(s: string): number | undefined {
  return s.trim() === '' ? undefined : Number(s);
}

async function saveSiteCounters() {
  const c = { pv: toCounter(sitePv.value), uv: toCounter(siteUv.value) };
  if (c.pv === undefined && c.uv === undefined) { toast(t('siteSettings.fillAtLeastOne'), 'error'); return; }
  try {
    const site = await api.setSiteCounters(props.site.id, c);
    emit('updated', site);
    toast(t('siteSettings.siteCountersUpdated'));
  } catch (e) { fail(e); }
}
async function searchPages() {
  try { pages.value = await api.pages(props.site.id, pageQuery.value.trim()); } catch (e) { fail(e); }
}
function pick(p: PageRow) {
  editPath.value = p.path; editPv.value = String(p.pv); editUv.value = String(p.uv);
}
async function savePageCounters() {
  if (!editPath.value.trim()) return;
  const c = { pv: toCounter(editPv.value), uv: toCounter(editUv.value) };
  if (c.pv === undefined && c.uv === undefined) { toast(t('siteSettings.fillAtLeastOne'), 'error'); return; }
  try {
    await api.setPageCounters(props.site.id, editPath.value.trim(), c);
    toast(t('siteSettings.pageCountersUpdated'));
    await searchPages();
  } catch (e) { fail(e); }
}

async function remove() {
  busy.value = true;
  try { await api.deleteSite(props.site.id); emit('deleted'); } catch (e) { fail(e); } finally { busy.value = false; }
}
</script>

<template>
  <Modal :open="open" :title="t('siteSettings.title', { name: site.name })" wide height="640px" @close="emit('close')">
    <template #nav>
      <button class="modal-nav" :class="{ active: tab === 'basic' }" @click="tab = 'basic'">{{ t('siteSettings.tabBasic') }}</button>
      <button class="modal-nav" :class="{ active: tab === 'tokens' }" @click="tab = 'tokens'">{{ t('siteSettings.tabTokens') }}</button>
      <button class="modal-nav" :class="{ active: tab === 'counters' }" @click="tab = 'counters'">{{ t('siteSettings.tabCounters') }}</button>
      <button class="modal-nav" :class="{ active: tab === 'danger' }" @click="tab = 'danger'">{{ t('siteSettings.tabDanger') }}</button>
    </template>

    <div v-if="tab === 'basic'">
      <div class="field"><label>{{ t('common.siteName') }}</label><input v-model="name" class="input" /></div>
      <div class="field">
        <label>{{ t('common.allowedOrigins') }}</label>
        <textarea v-model="originsText" class="textarea" />
      </div>
      <div class="field">
        <label>{{ t('siteSettings.retention') }}</label>
        <input v-model="retention" class="input" type="number" min="1" :placeholder="t('siteSettings.retentionPlaceholder')" />
        <div class="hint">{{ t('siteSettings.retentionHint') }}</div>
      </div>
      <div class="row"><button class="btn btn-primary" :disabled="busy" @click="saveBasic">{{ t('common.save') }}</button></div>
    </div>

    <div v-else-if="tab === 'tokens'">
      <table class="tbl">
        <thead><tr><th>{{ t('common.name') }}</th><th>Token</th><th>{{ t('siteSettings.lastUsed') }}</th><th></th></tr></thead>
        <tbody>
          <tr v-for="tk in tokens" :key="tk.id" :class="{ revoked: tk.revoked_at }">
            <td>{{ tk.name }}</td>
            <td><code>{{ tk.token }}</code></td>
            <td class="muted">{{ tk.revoked_at ? t('siteSettings.revoked') : fmt(tk.last_used_at) }}</td>
            <td class="ops">
              <template v-if="!tk.revoked_at">
                <button class="btn btn-sm" @click="toggleShown(tk)">{{ t('siteSettings.showCode') }}</button>
                <button class="btn btn-sm" @click="copyToken(tk)">{{ t('common.copyCode') }}</button>
                <button class="btn btn-sm btn-danger" @click="revoke(tk)">{{ t('siteSettings.revoke') }}</button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="row add">
        <input v-model="newTokenName" class="input" :placeholder="t('siteSettings.newTokenPlaceholder')" @keyup.enter="addToken" />
        <button class="btn" @click="addToken">{{ t('siteSettings.createToken') }}</button>
      </div>
      <code v-if="shownToken" class="snippet">{{ snippetFor(shownToken) }}</code>
    </div>

    <div v-else-if="tab === 'counters'">
      <div class="section-title first">{{ t('siteSettings.siteTotals') }}</div>
      <div class="inline">
        <div class="field"><label>PV</label><input v-model="sitePv" class="input" type="number" min="0" /></div>
        <div class="field"><label>UV</label><input v-model="siteUv" class="input" type="number" min="0" /></div>
        <button class="btn" @click="saveSiteCounters">{{ t('common.update') }}</button>
      </div>
      <div class="hint">{{ t('siteSettings.countersHint') }}</div>

      <div class="section-title">{{ t('siteSettings.pageTotals') }}</div>
      <div class="inline">
        <input v-model="pageQuery" class="input" :placeholder="t('siteSettings.searchPlaceholder')" @keyup.enter="searchPages" />
        <button class="btn" @click="searchPages">{{ t('common.search') }}</button>
      </div>
      <table v-if="pages.length" class="tbl compact">
        <tbody>
          <tr v-for="p in pages" :key="p.path" class="clickable" @click="pick(p)">
            <td><code>{{ p.path }}</code><div class="muted small">{{ p.title }}</div></td>
            <td class="num">{{ n(p.pv) }} / {{ n(p.uv) }}</td>
          </tr>
        </tbody>
      </table>
      <div class="inline">
        <div class="field grow"><label>{{ t('siteSettings.path') }}</label><input v-model="editPath" class="input" placeholder="/posts/hello/" /></div>
        <div class="field"><label>PV</label><input v-model="editPv" class="input" type="number" min="0" /></div>
        <div class="field"><label>UV</label><input v-model="editUv" class="input" type="number" min="0" /></div>
        <button class="btn" @click="savePageCounters">{{ t('common.update') }}</button>
      </div>
    </div>

    <div v-else>
      <p>{{ t('siteSettings.deleteWarning') }}</p>
      <div class="field">
        <i18n-t keypath="siteSettings.deleteConfirm" tag="label">
          <template #name><b>{{ site.name }}</b></template>
        </i18n-t>
        <input v-model="confirmName" class="input" />
      </div>
      <button class="btn btn-danger" :disabled="busy || confirmName !== site.name" @click="remove">{{ t('siteSettings.deleteSite') }}</button>
    </div>
  </Modal>
</template>

<style scoped>
.row { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.row.add { justify-content: flex-start; margin-top: 16px; }
.row.add .input { max-width: 320px; }
.inline { display: flex; gap: 12px; align-items: flex-end; }
.inline .field { margin-bottom: 0; }
.inline .field.grow { flex: 1; }
.inline .btn { margin-bottom: 1px; }
.inline .input[type="number"] { width: 120px; }
.section-title.first { margin-top: 0; }
.compact td { padding: 6px 8px; }
.small { font-size: 12px; }
.ops { text-align: right; white-space: nowrap; }
.ops .btn { margin-left: 6px; }
tr.revoked td { color: var(--text-3); }
.hint { font-size: 12px; color: var(--text-3); margin-top: 8px; }
</style>
