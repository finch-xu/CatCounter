import { Panel } from './Panel';

interface Props {
  label: string;
  value: string;
  hint?: React.ReactNode;
  chip?: React.ReactNode;
  chart?: React.ReactNode;
}

export function StatTile({ label, value, hint, chip, chart }: Props) {
  return (
    <Panel className="flex flex-1 basis-[220px] flex-col gap-1.5 px-5 py-4.5">
      <div className="flex min-h-5.5 items-center justify-between gap-2">
        <span className="text-[13px] text-subtle">{label}</span>
        {chip}
      </div>
      <div className="num text-[34px] font-semibold leading-[1.15] tracking-tight">{value}</div>
      <div className="flex items-end justify-between gap-3">
        <span className="text-xs tabular-nums text-muted-foreground">{hint}</span>
        {chart}
      </div>
    </Panel>
  );
}
