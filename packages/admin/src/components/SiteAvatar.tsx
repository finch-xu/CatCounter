import { siteColor } from '@/lib/siteColor';
import { cn } from '@/lib/utils';

export function SiteDot({ index, className }: { index: number; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', className)} style={{ background: siteColor(index) }} />
  );
}

export function SiteAvatar({ name, index, size = 'sm' }: { name: string; index: number; size?: 'sm' | 'lg' }) {
  // Array.from 按码点拆分，首字符是 emoji 等代理对时也不会被截成半个
  const initial = Array.from(name.trim())[0] ?? '?';
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center font-semibold text-foreground',
        size === 'lg' ? 'size-13 rounded-[14px] text-[22px]' : 'size-9 rounded-[10px]',
      )}
      style={{ background: `color-mix(in srgb, ${siteColor(index)} 18%, var(--card))` }}
    >
      {initial}
    </span>
  );
}
