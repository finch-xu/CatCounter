import { Tabs } from 'radix-ui';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface DialogTab<T extends string> {
  value: T;
  label: string;
  content: React.ReactNode;
}

interface Props<T extends string> {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  tabs: ReadonlyArray<DialogTab<T>>;
  value: T;
  onValueChange(value: T): void;
  /** 宽度与高度；高度固定，避免切换分页时弹窗跳动，超出部分在内容区滚动 */
  className?: string;
}

/** 多分页的设置弹窗：左侧分页导航，右侧标题与内容 */
export function TabbedDialog<T extends string>({ open, onOpenChange, title, tabs, value, onValueChange, className }: Props<T>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className={cn('flex gap-0 overflow-hidden p-0', className)}>
        <Tabs.Root
          orientation="vertical"
          value={value}
          onValueChange={(v) => onValueChange(v as T)}
          className="flex min-h-0 min-w-0 flex-1 flex-col sm:flex-row"
        >
          <Tabs.List className="flex shrink-0 gap-1 overflow-x-auto border-b bg-background p-3 sm:w-50 sm:flex-col sm:border-b-0 sm:border-r">
            {tabs.map((tab) => (
              <Tabs.Trigger
                key={tab.value}
                value={tab.value}
                className="flex min-h-10 items-center whitespace-nowrap rounded-[10px] px-3 text-left text-subtle outline-none transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=active]:bg-brand-soft data-[state=active]:font-semibold data-[state=active]:text-brand-text"
              >
                {tab.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <section className="flex min-h-0 min-w-0 flex-1 flex-col">
            <header className="border-b px-5 py-4 pr-12">
              <DialogTitle className="truncate text-base font-semibold">{title}</DialogTitle>
            </header>
            {tabs.map((tab) => (
              // forceMount：切走的分页只隐藏不卸载，没保存的输入不会丢
              <Tabs.Content
                key={tab.value} value={tab.value} forceMount hidden={tab.value !== value}
                className="min-h-0 flex-1 overflow-y-auto p-5 outline-none"
              >
                {tab.content}
              </Tabs.Content>
            ))}
          </section>
        </Tabs.Root>
      </DialogContent>
    </Dialog>
  );
}
