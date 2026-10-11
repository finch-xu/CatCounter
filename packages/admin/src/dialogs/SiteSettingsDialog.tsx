import type { PageRow, Site, Token } from '@catcounter/shared';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { TabbedDialog } from '@/components/TabbedDialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFormat } from '@/hooks/useFormat';
import { copyText, snippetFor } from '@/lib/snippet';
import { cn } from '@/lib/utils';
import {
  useCreateToken, usePageSearch, useRevokeToken, useSetPageCounters, useSetSiteCounters, useTokens, useUpdateSite,
} from '@/queries';

type Tab = 'basic' | 'tokens' | 'counters' | 'danger';

interface Props {
  site: Site;
  open: boolean;
  onOpenChange(open: boolean): void;
  /** 删除由站点页执行，弹窗只负责确认 */
  onDelete(): void;
  deleting: boolean;
}

/** 空输入表示不修改该项 */
function toCounter(s: string): number | undefined {
  return s.trim() === '' ? undefined : Number(s);
}

function useFail() {
  const { t } = useTranslation();
  return (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t('common.operationFailed'));
}

export function SiteSettingsDialog({ site, open, onOpenChange, onDelete, deleting }: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('basic');

  // 每次打开都回到第一个分页。在渲染阶段比较上一次的 open 来重置，这样重新打开的第一帧就是对的；
  // 各分页的表单状态不用管：弹窗关闭时内容整体卸载，再打开就是从站点当前的值开始
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setTab('basic');
  }

  return (
    <TabbedDialog<Tab>
      open={open}
      onOpenChange={onOpenChange}
      title={t('siteSettings.title', { name: site.name })}
      value={tab}
      onValueChange={setTab}
      className="h-[min(640px,85vh)] sm:max-w-[1000px]"
      tabs={[
        { value: 'basic', label: t('siteSettings.tabBasic'), content: <BasicTab site={site} /> },
        { value: 'tokens', label: t('siteSettings.tabTokens'), content: <TokensTab site={site} enabled={open} /> },
        { value: 'counters', label: t('siteSettings.tabCounters'), content: <CountersTab site={site} /> },
        { value: 'danger', label: t('siteSettings.tabDanger'), content: <DangerTab site={site} onDelete={onDelete} deleting={deleting} /> },
      ]}
    />
  );
}

function Field({ label, htmlFor, hint, className, children }: {
  label: React.ReactNode; htmlFor: string; hint?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-[13px] font-normal text-subtle">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[13px] font-semibold text-subtle">{children}</h3>;
}

function BasicTab({ site }: { site: Site }) {
  const { t } = useTranslation();
  const fail = useFail();
  const update = useUpdateSite(site.id);
  const [name, setName] = useState(site.name);
  const [originsText, setOriginsText] = useState(site.origins.join('\n'));
  const [retention, setRetention] = useState(site.retention_days ? String(site.retention_days) : '');

  function save(e: React.FormEvent) {
    e.preventDefault();
    update.mutate(
      {
        name: name.trim(),
        origins: originsText.split('\n').map((s) => s.trim()).filter(Boolean),
        retention_days: retention.trim() ? Number(retention) : null,
      },
      { onSuccess: () => toast.success(t('siteSettings.saved')), onError: fail },
    );
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <Field label={t('common.siteName')} htmlFor="ss-name">
        <Input id="ss-name" value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
      </Field>
      <Field label={t('common.allowedOrigins')} htmlFor="ss-origins">
        <Textarea id="ss-origins" value={originsText} onChange={(e) => setOriginsText(e.target.value)} className="min-h-24 font-mono text-[13px]" />
      </Field>
      <Field label={t('siteSettings.retention')} htmlFor="ss-retention" hint={t('siteSettings.retentionHint')}>
        <Input
          id="ss-retention" type="number" min={1} value={retention} onChange={(e) => setRetention(e.target.value)}
          placeholder={t('siteSettings.retentionPlaceholder')} className="h-10"
        />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={update.isPending}>{t('common.save')}</Button>
      </div>
    </form>
  );
}

function TokensTab({ site, enabled }: { site: Site; enabled: boolean }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const fail = useFail();
  const tokens = useTokens(site.id, enabled);
  const create = useCreateToken(site.id);
  const revoke = useRevokeToken(site.id);
  const [newName, setNewName] = useState('');
  const [shown, setShown] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<Token | null>(null);

  function add(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(newName.trim() || t('siteSettings.untitled'), { onSuccess: () => setNewName(''), onError: fail });
  }

  async function copy(token: Token) {
    if (await copyText(snippetFor(token.token))) toast.success(t('common.copied'));
    else toast.error(t('common.copyFailed'));
  }

  return (
    <div className="flex flex-col gap-4">
      {tokens.isError && <p role="alert" className="text-[13px] text-destructive">{tokens.error.message}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="text-left text-xs text-muted-foreground [&>th]:border-b [&>th]:px-2 [&>th]:py-2 [&>th]:font-medium">
              <th scope="col">{t('common.name')}</th>
              <th scope="col">Token</th>
              <th scope="col">{t('siteSettings.lastUsed')}</th>
              <th scope="col"><span className="sr-only">{t('common.settings')}</span></th>
            </tr>
          </thead>
          <tbody className="[&>tr>td]:border-b [&>tr>td]:border-grid [&>tr>td]:px-2 [&>tr>td]:py-2.5">
            {tokens.data?.map((tk) => (
              <tr key={tk.id} className={cn(tk.revoked_at && 'text-muted-foreground')}>
                <td>{tk.name}</td>
                <td><code className="text-xs">{tk.token}</code></td>
                <td className="tabular-nums text-muted-foreground">
                  {tk.revoked_at
                    ? t('siteSettings.revoked')
                    : tk.last_used_at ? fmt.date(tk.last_used_at * 1000, 'long') : t('siteSettings.never')}
                </td>
                <td className="whitespace-nowrap text-right">
                  {!tk.revoked_at && (
                    <span className="inline-flex gap-1.5">
                      <Button variant="outline" size="sm" aria-expanded={shown === tk.token} onClick={() => setShown(shown === tk.token ? null : tk.token)}>
                        {t('siteSettings.showCode')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void copy(tk)}>{t('common.copyCode')}</Button>
                      <Button variant="destructive" size="sm" onClick={() => setRevoking(tk)}>{t('siteSettings.revoke')}</Button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form onSubmit={add} className="flex flex-wrap gap-2">
        <Input
          value={newName} onChange={(e) => setNewName(e.target.value)} aria-label={t('siteSettings.createToken')}
          placeholder={t('siteSettings.newTokenPlaceholder')} className="h-9 max-w-80"
        />
        <Button type="submit" variant="outline" size="lg" disabled={create.isPending}>{t('siteSettings.createToken')}</Button>
      </form>
      {shown && (
        <pre className="overflow-x-auto rounded-lg border bg-muted p-3 text-xs leading-relaxed"><code>{snippetFor(shown)}</code></pre>
      )}

      <AlertDialog open={revoking !== null} onOpenChange={(o) => !o && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('siteSettings.revoke')}</AlertDialogTitle>
            <AlertDialogDescription>{revoking && t('siteSettings.revokeConfirm', { name: revoking.name })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => revoking && revoke.mutate(revoking.id, { onError: fail })}
            >
              {t('siteSettings.revoke')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CountersTab({ site }: { site: Site }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const fail = useFail();
  const setSite = useSetSiteCounters(site.id);
  const setPage = useSetPageCounters(site.id);
  const [sitePv, setSitePv] = useState(String(site.pv));
  const [siteUv, setSiteUv] = useState(String(site.uv));
  const [queryInput, setQueryInput] = useState('');
  // 点了“搜索”才发请求：submitted 是已提交的关键词，null 表示还没搜过
  const [submitted, setSubmitted] = useState<string | null>(null);
  const pages = usePageSearch(site.id, submitted ?? '', submitted !== null);
  const [editPath, setEditPath] = useState('');
  const [editPv, setEditPv] = useState('');
  const [editUv, setEditUv] = useState('');

  function saveSite(e: React.FormEvent) {
    e.preventDefault();
    const c = { pv: toCounter(sitePv), uv: toCounter(siteUv) };
    if (c.pv === undefined && c.uv === undefined) return void toast.error(t('siteSettings.fillAtLeastOne'));
    setSite.mutate(c, { onSuccess: () => toast.success(t('siteSettings.siteCountersUpdated')), onError: fail });
  }

  function pick(p: PageRow) {
    setEditPath(p.path);
    setEditPv(String(p.pv));
    setEditUv(String(p.uv));
  }

  function savePage(e: React.FormEvent) {
    e.preventDefault();
    if (!editPath.trim()) return;
    const c = { pv: toCounter(editPv), uv: toCounter(editUv) };
    if (c.pv === undefined && c.uv === undefined) return void toast.error(t('siteSettings.fillAtLeastOne'));
    setPage.mutate(
      { path: editPath.trim(), ...c },
      { onSuccess: () => toast.success(t('siteSettings.pageCountersUpdated')), onError: fail },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={saveSite} className="flex flex-col gap-2.5">
        <SectionTitle>{t('siteSettings.siteTotals')}</SectionTitle>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="PV" htmlFor="sc-pv"><Input id="sc-pv" type="number" min={0} value={sitePv} onChange={(e) => setSitePv(e.target.value)} className="h-9 w-32" /></Field>
          <Field label="UV" htmlFor="sc-uv"><Input id="sc-uv" type="number" min={0} value={siteUv} onChange={(e) => setSiteUv(e.target.value)} className="h-9 w-32" /></Field>
          <Button type="submit" variant="outline" size="lg" disabled={setSite.isPending}>{t('common.update')}</Button>
        </div>
        <p className="text-xs text-muted-foreground">{t('siteSettings.countersHint')}</p>
      </form>

      <div className="flex flex-col gap-2.5">
        <SectionTitle>{t('siteSettings.pageTotals')}</SectionTitle>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const term = queryInput.trim();
            // 关键词没变时查询键也不变，要显式重新请求（比如刚改完计数想看最新的）
            if (term === submitted) void pages.refetch();
            else setSubmitted(term);
          }}
        >
          <Input
            type="search" value={queryInput} onChange={(e) => setQueryInput(e.target.value)} aria-label={t('common.search')}
            placeholder={t('siteSettings.searchPlaceholder')} className="h-9 min-w-0 flex-1"
          />
          <Button type="submit" variant="outline" size="lg">{t('common.search')}</Button>
        </form>
        {pages.isError && <p role="alert" className="text-[13px] text-destructive">{pages.error.message}</p>}
        {pages.data && pages.data.length === 0 && <p className="py-2 text-[13px] text-muted-foreground">{t('common.noData')}</p>}
        {pages.data && pages.data.length > 0 && (
          <ul className="max-h-56 overflow-y-auto rounded-lg border">
            {pages.data.map((p) => (
              <li key={p.path} className="border-b border-grid last:border-b-0">
                <button
                  type="button" onClick={() => pick(p)}
                  className={cn('flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted', editPath === p.path && 'bg-brand-soft hover:bg-brand-soft')}
                >
                  <span className="min-w-0">
                    <code className="block truncate text-xs">{p.path}</code>
                    {p.title && <span className="block truncate text-xs text-muted-foreground">{p.title}</span>}
                  </span>
                  <span className="num shrink-0 text-[13px]">{fmt.n(p.pv)} / {fmt.n(p.uv)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={savePage} className="flex flex-wrap items-end gap-3">
          <Field label={t('siteSettings.path')} htmlFor="pc-path" className="min-w-48 flex-1">
            <Input id="pc-path" value={editPath} onChange={(e) => setEditPath(e.target.value)} placeholder="/posts/hello/" className="h-9" />
          </Field>
          <Field label="PV" htmlFor="pc-pv"><Input id="pc-pv" type="number" min={0} value={editPv} onChange={(e) => setEditPv(e.target.value)} className="h-9 w-28" /></Field>
          <Field label="UV" htmlFor="pc-uv"><Input id="pc-uv" type="number" min={0} value={editUv} onChange={(e) => setEditUv(e.target.value)} className="h-9 w-28" /></Field>
          <Button type="submit" variant="outline" size="lg" disabled={setPage.isPending || !editPath.trim()}>{t('common.update')}</Button>
        </form>
      </div>
    </div>
  );
}

function DangerTab({ site, onDelete, deleting }: { site: Site; onDelete(): void; deleting: boolean }) {
  const { t } = useTranslation();
  const [confirmName, setConfirmName] = useState('');
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onDelete();
      }}
    >
      <p>{t('siteSettings.deleteWarning')}</p>
      <Field
        htmlFor="ss-confirm"
        label={<Trans i18nKey="siteSettings.deleteConfirm" components={{ name: <b className="text-foreground">{site.name}</b> }} />}
      >
        <Input id="ss-confirm" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} autoComplete="off" className="h-10" />
      </Field>
      <div>
        <Button type="submit" variant="destructive" size="lg" disabled={deleting || confirmName !== site.name}>
          {t('siteSettings.deleteSite')}
        </Button>
      </div>
    </form>
  );
}
