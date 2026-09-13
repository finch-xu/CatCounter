<script setup lang="ts">
import { ref, watch } from 'vue';
import type { PageRow, Site, Token } from '@catcounter/shared';
import { api } from '../api';
import Modal from '../components/Modal.vue';
import { useToast } from '../composables/useToast';
import { copyText, snippetFor } from '../utils/snippet';

const props = defineProps<{ open: boolean; site: Site }>();
const emit = defineEmits<{ close: []; updated: [site: Site]; deleted: [] }>();
const { toast } = useToast();

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
  await loadTokens();
});

function fail(e: unknown) {
  toast(e instanceof Error ? e.message : '操作失败', 'error');
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
    toast('已保存');
  } catch (e) { fail(e); } finally { busy.value = false; }
}

async function loadTokens() {
  try { tokens.value = await api.tokens(props.site.id); } catch (e) { fail(e); }
}
async function addToken() {
  try {
    await api.createToken(props.site.id, newTokenName.value.trim() || '未命名');
    newTokenName.value = '';
    await loadTokens();
  } catch (e) { fail(e); }
}
async function revoke(t: Token) {
  if (!confirm(`吊销 token「${t.name}」后，使用它的页面将无法计数。继续？`)) return;
  try { await api.revokeToken(props.site.id, t.id); await loadTokens(); } catch (e) { fail(e); }
}
async function copyToken(t: Token) {
  if (await copyText(snippetFor(t.token))) toast('已复制接入代码');
}
function fmt(ts: number | null): string {
  return ts ? new Date(ts * 1000).toLocaleString('zh-CN') : '从未';
}

async function saveSiteCounters() {
  try {
    const site = await api.setSiteCounters(props.site.id, { pv: Number(sitePv.value), uv: Number(siteUv.value) });
    emit('updated', site);
    toast('已更新站点计数');
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
  try {
    await api.setPageCounters(props.site.id, editPath.value.trim(), { pv: Number(editPv.value), uv: Number(editUv.value) });
    toast('已更新页面计数');
    await searchPages();
  } catch (e) { fail(e); }
}

async function remove() {
  busy.value = true;
  try { await api.deleteSite(props.site.id); emit('deleted'); } catch (e) { fail(e); } finally { busy.value = false; }
}
</script>

<template>
  <Modal :open="open" :title="`站点设置 · ${site.name}`" wide @close="emit('close')">
    <template #nav>
      <button class="modal-nav" :class="{ active: tab === 'basic' }" @click="tab = 'basic'">基本信息</button>
      <button class="modal-nav" :class="{ active: tab === 'tokens' }" @click="tab = 'tokens'">Token</button>
      <button class="modal-nav" :class="{ active: tab === 'counters' }" @click="tab = 'counters'">修正计数</button>
      <button class="modal-nav" :class="{ active: tab === 'danger' }" @click="tab = 'danger'">危险区</button>
    </template>

    <div v-if="tab === 'basic'">
      <div class="field"><label>站点名称</label><input v-model="name" class="input" /></div>
      <div class="field">
        <label>允许的 Origin（每行一个）</label>
        <textarea v-model="originsText" class="textarea" />
      </div>
      <div class="field">
        <label>按日页面数据保留天数</label>
        <input v-model="retention" class="input" type="number" min="1" placeholder="留空表示永久保留" />
        <div class="hint">只影响“每日每页”明细，累计计数和每日站点总量不受影响。</div>
      </div>
      <div class="row"><button class="btn btn-primary" :disabled="busy" @click="saveBasic">保存</button></div>
    </div>

    <div v-else-if="tab === 'tokens'">
      <table class="tbl">
        <thead><tr><th>名称</th><th>Token</th><th>最后使用</th><th></th></tr></thead>
        <tbody>
          <tr v-for="t in tokens" :key="t.id" :class="{ revoked: t.revoked_at }">
            <td>{{ t.name }}</td>
            <td><code>{{ t.token }}</code></td>
            <td class="muted">{{ t.revoked_at ? '已吊销' : fmt(t.last_used_at) }}</td>
            <td class="ops">
              <template v-if="!t.revoked_at">
                <button class="btn btn-sm" @click="copyToken(t)">复制代码</button>
                <button class="btn btn-sm btn-danger" @click="revoke(t)">吊销</button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="row add">
        <input v-model="newTokenName" class="input" placeholder="新 token 名称，例如“新主题”" @keyup.enter="addToken" />
        <button class="btn" @click="addToken">创建 token</button>
      </div>
    </div>

    <div v-else-if="tab === 'counters'">
      <div class="section-title first">站点累计</div>
      <div class="inline">
        <div class="field"><label>PV</label><input v-model="sitePv" class="input" type="number" min="0" /></div>
        <div class="field"><label>UV</label><input v-model="siteUv" class="input" type="number" min="0" /></div>
        <button class="btn" @click="saveSiteCounters">更新</button>
      </div>
      <div class="hint">用于从不蒜子等服务迁移时导入历史数字。只改累计值，不改按日数据。</div>

      <div class="section-title">页面累计</div>
      <div class="inline">
        <input v-model="pageQuery" class="input" placeholder="按路径搜索，例如 /posts/" @keyup.enter="searchPages" />
        <button class="btn" @click="searchPages">搜索</button>
      </div>
      <table v-if="pages.length" class="tbl compact">
        <tbody>
          <tr v-for="p in pages" :key="p.path" class="clickable" @click="pick(p)">
            <td><code>{{ p.path }}</code><div class="muted small">{{ p.title }}</div></td>
            <td class="num">{{ p.pv }} / {{ p.uv }}</td>
          </tr>
        </tbody>
      </table>
      <div class="inline">
        <div class="field grow"><label>路径</label><input v-model="editPath" class="input" placeholder="/posts/hello/" /></div>
        <div class="field"><label>PV</label><input v-model="editPv" class="input" type="number" min="0" /></div>
        <div class="field"><label>UV</label><input v-model="editUv" class="input" type="number" min="0" /></div>
        <button class="btn" @click="savePageCounters">更新</button>
      </div>
    </div>

    <div v-else>
      <p>删除站点会移除它的全部计数、按日数据和 token，且无法恢复。</p>
      <div class="field">
        <label>输入站点名称 <b>{{ site.name }}</b> 以确认</label>
        <input v-model="confirmName" class="input" />
      </div>
      <button class="btn btn-danger" :disabled="busy || confirmName !== site.name" @click="remove">删除站点</button>
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
