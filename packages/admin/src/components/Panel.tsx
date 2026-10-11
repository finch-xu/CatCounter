import { cn } from '@/lib/utils';

/** 页面上的白色卡片容器 */
export function Panel({ className, ...props }: React.ComponentProps<'section'>) {
  return <section className={cn('rounded-[14px] border bg-card shadow-card', className)} {...props} />;
}
