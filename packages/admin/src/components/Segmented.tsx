import { ToggleGroup } from 'radix-ui';
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface Props<T extends string> {
  value: T;
  onChange(value: T): void;
  options: ReadonlyArray<SegmentedOption<T>>;
  label: string;
  className?: string;
}

/** 分段选择：始终有且只有一项被选中 */
export function Segmented<T extends string>({ value, onChange, options, label, className }: Props<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      // Radix 允许点已选项取消选中，这里忽略空值以保证始终有选中项
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={label}
      className={cn('inline-flex w-fit max-w-full rounded-xl bg-secondary p-[3px]', className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          className="inline-flex h-9.5 items-center gap-1.5 whitespace-nowrap rounded-[9px] px-3.5 text-subtle outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=on]:bg-card data-[state=on]:font-semibold data-[state=on]:text-foreground data-[state=on]:shadow-[0_1px_2px_rgb(31_30_29/0.12)]"
        >
          {o.icon}
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
