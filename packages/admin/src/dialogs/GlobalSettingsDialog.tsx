import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import logo from '@/assets/logo.png';
import { Segmented } from '@/components/Segmented';
import { TabbedDialog } from '@/components/TabbedDialog';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/useLocale';
import { useTheme, type Theme } from '@/hooks/useTheme';
import { LOCALES } from '@/i18n';
import { useLogout } from '@/queries';

type Tab = 'appearance' | 'account' | 'about';

export function GlobalSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange(open: boolean): void }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('appearance');
  return (
    <TabbedDialog<Tab>
      open={open}
      onOpenChange={onOpenChange}
      title={t('settings.title')}
      value={tab}
      onValueChange={setTab}
      className="h-[min(420px,85vh)] sm:max-w-[720px]"
      tabs={[
        { value: 'appearance', label: t('settings.tabAppearance'), content: <AppearanceTab /> },
        { value: 'account', label: t('settings.tabAccount'), content: <AccountTab onDone={() => onOpenChange(false)} /> },
        { value: 'about', label: t('settings.tabAbout'), content: <AboutTab /> },
      ]}
    />
  );
}

function AppearanceTab() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const themes: Array<{ value: Theme; label: string }> = [
    { value: 'system', label: t('settings.themeSystem') },
    { value: 'light', label: t('settings.themeLight') },
    { value: 'dark', label: t('settings.themeDark') },
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-[13px] text-subtle">{t('settings.theme')}</span>
        <Segmented value={theme} onChange={setTheme} options={themes} label={t('settings.theme')} />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] text-subtle">{t('settings.language')}</span>
        <Segmented value={locale} onChange={setLocale} options={LOCALES} label={t('settings.language')} />
      </div>
    </div>
  );
}

function AccountTab({ onDone }: { onDone(): void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useLogout();
  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-subtle">
        <Trans
          i18nKey="settings.accountHint"
          components={{ secret: <code className="rounded-[5px] bg-background px-1.5 py-px text-foreground">ADMIN_PASSWORD</code> }}
        />
      </p>
      <Button
        variant="outline" size="lg" disabled={logout.isPending}
        onClick={() =>
          logout.mutate(undefined, {
            onSettled: () => {
              onDone();
              navigate('/login', { replace: true });
            },
          })
        }
      >
        {t('settings.logout')}
      </Button>
    </div>
  );
}

function AboutTab() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-1.5 pt-2 text-center">
      <img src={logo} alt="CatCounter logo" className="mb-1 size-24 object-contain" />
      <p className="font-serif text-lg font-semibold">CatCounter</p>
      <p className="text-subtle">{t('settings.aboutDescription')}</p>
      <p className="text-subtle">
        <Trans
          i18nKey="settings.source"
          components={{
            link: (
              <a
                href="https://github.com/finch-xu/CatCounter" target="_blank" rel="noopener noreferrer"
                className="text-brand-text underline-offset-4 hover:underline"
              >
                github.com/finch-xu/CatCounter
              </a>
            ),
          }}
        />
      </p>
      <p className="tabular-nums text-subtle">{t('settings.version', { version: __APP_VERSION__ })}</p>
    </div>
  );
}
