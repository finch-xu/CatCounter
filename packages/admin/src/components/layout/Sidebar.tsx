import { LayoutDashboard, SlidersHorizontal, Table2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import logo from '@/assets/logo.png';
import { SiteDot } from '@/components/SiteAvatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useFormat } from '@/hooks/useFormat';
import { cn } from '@/lib/utils';
import { useOverview } from '@/queries';

const item = 'flex min-h-11 items-center gap-2.5 rounded-[10px] px-3 text-subtle transition-colors hover:bg-accent';
const itemActive = 'bg-brand-soft font-semibold text-brand-text hover:bg-brand-soft';
const linkClass = ({ isActive }: { isActive: boolean }) => cn(item, isActive && itemActive);

export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <img src={logo} alt="" className="size-9 object-contain" />
      <span className="font-serif text-[21px] font-semibold tracking-tight">CatCounter</span>
    </div>
  );
}

export function Sidebar({ className, onOpenSettings }: { className?: string; onOpenSettings: () => void }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { data, isPending } = useOverview();
  const sites = data?.sites ?? [];

  return (
    <aside className={cn('w-62 shrink-0 flex-col gap-1 border-r bg-muted px-3.5 pb-3.5 pt-5', className)}>
      <Brand className="px-2 pb-4.5" />
      <nav aria-label={t('common.menu')} className="flex flex-col gap-0.5">
        <NavLink to="/" end className={linkClass}>
          <LayoutDashboard aria-hidden="true" className="size-4.5" />
          <span>{t('sidebar.overview')}</span>
        </NavLink>
        <NavLink to="/details" className={linkClass}>
          <Table2 aria-hidden="true" className="size-4.5" />
          <span>{t('sidebar.details')}</span>
        </NavLink>
      </nav>

      <div className="flex items-center justify-between px-3 pb-1.5 pt-5 text-xs tracking-wide text-muted-foreground">
        <span>{t('sidebar.sites')}</span>
        {data && <span className="num">{fmt.n(sites.length)}</span>}
      </div>
      <nav aria-label={t('sidebar.sites')} className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
        {isPending && [0, 1, 2].map((i) => <Skeleton key={i} className="mx-3 my-2.5 h-5" />)}
        {sites.map((s, i) => (
          <NavLink key={s.id} to={`/sites/${s.id}`} className={linkClass}>
            <SiteDot index={i} />
            <span className="min-w-0 flex-1 truncate">{s.name}</span>
            <span className="num text-xs opacity-80">{fmt.n(s.today.pv)}</span>
          </NavLink>
        ))}
        {data && sites.length === 0 && <p className="px-3 py-1.5 text-[13px] text-muted-foreground">{t('sidebar.empty')}</p>}
      </nav>

      <div className="mt-2 flex items-center gap-2.5 border-t px-2 pt-3">
        <div aria-hidden="true" className="grid size-8.5 shrink-0 place-items-center rounded-full bg-brand-soft text-[13px] font-semibold text-brand-text">
          {t('sidebar.avatar')}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="font-semibold">{t('sidebar.admin')}</div>
          <div className="truncate text-xs text-muted-foreground">{location.host}</div>
        </div>
        <button
          type="button"
          aria-label={t('common.settings')}
          onClick={onOpenSettings}
          className="grid size-11 shrink-0 place-items-center rounded-[10px] text-subtle transition-colors hover:bg-accent"
        >
          <SlidersHorizontal aria-hidden="true" className="size-4.5" />
        </button>
      </div>
    </aside>
  );
}
