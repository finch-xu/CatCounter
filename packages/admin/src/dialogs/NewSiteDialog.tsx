import type { Site, Token } from '@catcounter/shared';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { copyText, snippetFor } from '@/lib/snippet';
import { useCreateSite } from '@/queries';

export function NewSiteDialog({ open, onOpenChange }: { open: boolean; onOpenChange(open: boolean): void }) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{t('newSite.title')}</DialogTitle>
        </DialogHeader>
        {/* 表单状态放在弹窗内容里：关闭时随内容卸载，每次打开都是一张空表单 */}
        <NewSiteForm onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function NewSiteForm({ onClose }: { onClose(): void }) {
  const { t } = useTranslation();
  const create = useCreateSite();
  const [name, setName] = useState('');
  const [originsText, setOriginsText] = useState('');
  const [result, setResult] = useState<{ site: Site; token: Token } | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const origins = originsText.split('\n').map((s) => s.trim()).filter(Boolean);
    create.mutate({ name: name.trim(), origins }, { onSuccess: setResult });
  }

  async function copy() {
    if (!result) return;
    if (await copyText(snippetFor(result.token.token))) toast.success(t('common.copied'));
    else toast.error(t('common.copyFailed'));
  }

  if (result) {
    return (
      <div className="flex min-w-0 flex-col gap-4">
        <p><Trans i18nKey="newSite.created" components={{ name: <b>{result.site.name}</b> }} /></p>
        <pre className="overflow-x-auto rounded-lg border bg-muted p-3 text-xs leading-relaxed"><code>{snippetFor(result.token.token)}</code></pre>
        <DialogFooter>
          <Button variant="outline" size="lg" onClick={copy}>{t('common.copyCode')}</Button>
          <Button size="lg" onClick={onClose}>{t('common.done')}</Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-site-name">{t('common.siteName')}</Label>
        <Input
          id="new-site-name" value={name} onChange={(e) => setName(e.target.value)}
          placeholder={t('newSite.namePlaceholder')} className="h-10"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-site-origins">{t('common.allowedOrigins')}</Label>
        <Textarea
          id="new-site-origins" value={originsText} onChange={(e) => setOriginsText(e.target.value)}
          placeholder={'https://blog.example.com\nhttp://localhost:4000'} className="min-h-24 font-mono text-[13px]"
        />
        <p className="text-xs text-muted-foreground">{t('newSite.originsHint')}</p>
      </div>
      {create.isError && <p role="alert" className="text-[13px] text-destructive">{create.error.message || t('newSite.createFailed')}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" size="lg" onClick={onClose}>{t('common.cancel')}</Button>
        <Button type="submit" size="lg" disabled={create.isPending || !name.trim() || !originsText.trim()}>{t('common.create')}</Button>
      </DialogFooter>
    </form>
  );
}
