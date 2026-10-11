import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFormat } from '@/hooks/useFormat';
import { cn } from '@/lib/utils';

interface Props {
  /** 相对变化（0.1 表示 +10%）；无法比较时为 null，不渲染 */
  value: number | null;
  /** 徽标里的短前缀，如“7 日” */
  prefix?: string;
  /** 这个数字比的是什么；给了它徽标就变成可聚焦、可点开的说明 */
  title?: string;
}

const TONES = {
  up: { icon: ArrowUp, sign: '+', className: 'bg-positive-soft text-positive' },
  down: { icon: ArrowDown, sign: '−', className: 'bg-destructive-soft text-destructive' },
  flat: { icon: Minus, sign: '', className: 'bg-accent text-subtle' },
} as const;

export function DeltaChip({ value, prefix, title }: Props) {
  const fmt = useFormat();
  const [open, setOpen] = useState(false);
  if (value === null) return null;

  const tone = TONES[value > 0 ? 'up' : value < 0 ? 'down' : 'flat'];
  const Icon = tone.icon;
  const text = fmt.pct(Math.abs(value));
  const className = cn(
    'num inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold',
    tone.className,
  );
  const body = (
    <>
      {prefix && <span className="font-medium opacity-80">{prefix}</span>}
      <Icon aria-hidden="true" className="size-3" strokeWidth={2.6} />
      <span>{text}</span>
    </>
  );
  if (!title) return <span className={className}>{body}</span>;

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`${title}: ${tone.sign}${text}`}
            // 悬停和键盘聚焦由 Tooltip 处理；触屏没有悬停，点一下显示说明，点别处（失焦）收起。
            // preventDefault 是为了不让 Tooltip 自带的“点击即关闭”把说明关掉
            onClick={(e) => {
              e.preventDefault();
              setOpen(true);
            }}
            className={cn(className, 'outline-none focus-visible:ring-3 focus-visible:ring-ring/50')}
          >
            {body}
          </button>
        </TooltipTrigger>
        <TooltipContent>{title}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
