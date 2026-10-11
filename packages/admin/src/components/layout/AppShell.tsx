import { Menu } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { GlobalSettingsDialog } from '@/dialogs/GlobalSettingsDialog';
import { Brand, Sidebar } from './Sidebar';

export default function AppShell() {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const openSettings = () => {
    setMenuOpen(false);
    setSettingsOpen(true);
  };

  return (
    <TooltipProvider>
      <div className="flex min-h-full">
        <Sidebar className="sticky top-0 hidden h-screen md:flex" onOpenSettings={openSettings} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b bg-muted px-4 py-2 md:hidden">
            <Brand />
            <button
              type="button"
              aria-label={t('common.menu')}
              onClick={() => setMenuOpen(true)}
              className="grid size-11 place-items-center rounded-[10px] text-subtle hover:bg-accent"
            >
              <Menu aria-hidden="true" className="size-5" />
            </button>
          </div>
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="left" aria-describedby={undefined} className="w-auto gap-0 p-0">
            <SheetTitle className="sr-only">{t('common.menu')}</SheetTitle>
            <Sidebar className="flex h-full border-r-0" onOpenSettings={openSettings} onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>
        <GlobalSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>
    </TooltipProvider>
  );
}
