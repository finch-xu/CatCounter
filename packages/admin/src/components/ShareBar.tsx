import { useFormat } from '@/hooks/useFormat';
import { share } from '@/lib/metrics';

export interface Segment {
  key: string;
  value: number;
  color: string;
  label: string;
}

/** 分段占比条；value 不为正的段不画 */
export function ShareBar({ segments }: { segments: Segment[] }) {
  const fmt = useFormat();
  const visible = segments.filter((s) => s.value > 0);
  const total = visible.reduce((a, s) => a + s.value, 0);
  const label = visible.map((s) => `${s.label} ${fmt.pct(share(s.value, total))}`).join(', ');
  return (
    <div role="img" aria-label={label} className="flex h-3 gap-[3px] overflow-hidden rounded-md">
      {visible.map((s) => (
        <span key={s.key} className="min-w-1 rounded-xs" style={{ flex: `${s.value} 1 0`, background: s.color }} />
      ))}
    </div>
  );
}
