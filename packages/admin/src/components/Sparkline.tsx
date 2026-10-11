const W = 96;
const H = 32;
const PAD = 3;

/** 迷你走势线；点数不足或数值全相等时画一条水平线 */
export function Sparkline({ values, color, label }: { values: number[]; color: string; label: string }) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const flat = values.length < 2 || hi === lo;
  const d = flat
    ? `M${PAD} ${H / 2} L${W - PAD} ${H / 2}`
    : values
        .map((v, i) => {
          const x = PAD + ((W - PAD * 2) * i) / (values.length - 1);
          const y = H - PAD - ((H - PAD * 2) * (v - lo)) / (hi - lo);
          return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(' ');
  return (
    <svg role="img" aria-label={label} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" className="shrink-0">
      <path d={d} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
