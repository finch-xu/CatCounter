import { Check, Eye, EyeOff, Lock } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import logo from '@/assets/logo.png';
import { Brand } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/hooks/useLocale';
import { isLocale, LOCALES } from '@/i18n';
import { safeNext } from '@/lib/safeNext';
import { useLogin } from '@/queries';

const FEATURES = ['login.feature1', 'login.feature2', 'login.feature3'] as const;

/** 页脚示例：把文案里的两个数字位置换成加粗的示例数字 */
function FooterSample() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const values: Record<string, string> = { pv: fmt.n(12345), uv: fmt.n(6789) };
  const parts = t('snippet.siteLine', { pv: '\u0000pv\u0000', uv: '\u0000uv\u0000' }).split('\u0000');
  return (
    <span className="text-[15px]">
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i} className="num text-brand-text">{values[part]}</strong> : part,
      )}
    </span>
  );
}

export default function LoginPage() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const login = useLogin();
  // 到了登录页就说明上一段会话结束了（主动退出或过期），把它留下的数据清掉
  const queryClient = useQueryClient();
  useEffect(() => queryClient.clear(), [queryClient]);
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    login.mutate(password, { onSuccess: () => navigate(safeNext(params.get('next')), { replace: true }) });
  }

  return (
    <div className="flex min-h-screen flex-wrap bg-background">
      <section className="flex flex-1 basis-[420px] flex-col justify-between gap-8 bg-brand-soft px-6 py-8 md:px-14 md:py-12">
        <Brand />
        <div className="flex max-w-[520px] flex-col gap-7">
          <img src={logo} alt="CatCounter" className="-ml-3 hidden size-55 object-contain lg:block" />
          <div>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-[40px]">{t('login.headline')}</h1>
            <p className="mt-3.5 max-w-[440px] text-base text-subtle">{t('settings.aboutDescription')}</p>
          </div>
          <ul className="hidden flex-col gap-3 text-[15px] lg:flex">
            {FEATURES.map((key) => (
              <li key={key} className="flex items-center gap-3">
                <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="hidden max-w-[440px] flex-col gap-1 rounded-[14px] border bg-card px-4.5 py-3.5 lg:flex">
          <span className="text-xs text-muted-foreground">{t('login.sampleLabel')}</span>
          <FooterSample />
        </div>
      </section>

      <section className="flex flex-1 basis-[420px] flex-col gap-6 px-4 pb-8 pt-6 md:px-8">
        <div className="flex justify-end">
          <Select value={locale} onValueChange={(v) => isLocale(v) && setLocale(v)}>
            <SelectTrigger aria-label={t('settings.language')} className="bg-card data-[size=default]:h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCALES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <form
            onSubmit={submit}
            className="flex w-full max-w-[400px] flex-col gap-5 rounded-[20px] border bg-card p-9 pb-8 shadow-[0_1px_2px_rgb(31_30_29/0.04),0_16px_40px_rgb(31_30_29/0.07)]"
          >
            <div>
              <h2 className="text-[26px] font-semibold tracking-tight">{t('login.title')}</h2>
              <p className="mt-1.5 text-subtle">{t('login.subtitle')}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pw" className="text-[13px] font-semibold text-subtle">{t('login.password')}</Label>
              <div className="relative">
                <Lock aria-hidden="true" className="pointer-events-none absolute left-3.5 top-4 size-4 text-muted-foreground" />
                <Input
                  id="pw"
                  type={visible ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  autoComplete="current-password"
                  aria-invalid={login.isError || undefined}
                  className="h-12 rounded-xl bg-muted pl-10 pr-13"
                />
                <button
                  type="button"
                  aria-label={t(visible ? 'login.hidePassword' : 'login.showPassword')}
                  onClick={() => setVisible((v) => !v)}
                  className="absolute right-0.5 top-0.5 grid size-11 place-items-center rounded-[10px] text-subtle hover:bg-accent"
                >
                  {visible ? <EyeOff aria-hidden="true" className="size-4.5" /> : <Eye aria-hidden="true" className="size-4.5" />}
                </button>
              </div>
              {login.isError && <p role="alert" className="text-[13px] text-destructive">{login.error.message || t('login.failed')}</p>}
            </div>
            <Button type="submit" size="touch" className="h-12 text-[15px]" disabled={login.isPending || !password}>
              {t('login.submit')}
            </Button>
            <p className="border-t border-grid pt-4 text-xs text-muted-foreground">
              <Trans
                i18nKey="login.forgot"
                components={{ secret: <code className="rounded-[5px] bg-background px-1.5 py-px text-foreground">ADMIN_PASSWORD</code> }}
              />
            </p>
          </form>
        </div>

        <div className="flex flex-wrap justify-center gap-1.5 text-xs text-muted-foreground">
          <span>CatCounter ·</span>
          <a
            href="https://github.com/finch-xu/CatCounter"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-text underline-offset-4 hover:underline"
          >
            {t('login.sourceLink')}
          </a>
        </div>
      </section>
    </div>
  );
}
