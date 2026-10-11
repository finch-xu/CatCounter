import { cn } from '@/lib/utils';

interface Props {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, leading, actions }: Props) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3.5">
        {leading}
        <div className="min-w-0">
          {eyebrow && <div className="text-[13px] text-muted-foreground">{eyebrow}</div>}
          <h1 className="mt-0.5 truncate text-[28px] font-semibold leading-tight tracking-tight">{title}</h1>
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  );
}

/** 页面内容区：统一的最大宽度、留白与纵向间距 */
export function PageBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mx-auto flex max-w-[1240px] flex-col gap-5 px-4 pb-10 pt-7 md:px-8', className)} {...props} />;
}
