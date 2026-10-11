export type Range = '7' | '30' | '90' | 'custom';
export type PresetRange = Exclude<Range, 'custom'>;
export const PRESET_RANGES: PresetRange[] = ['7', '30', '90'];

export function isRange(v: unknown): v is Range {
  return v === '7' || v === '30' || v === '90' || v === 'custom';
}

/** 预设范围对应的日期（UTC，与后端 dayOf 一致），截止到今天 */
export function presetDates(range: PresetRange, now: Date = new Date()): { from: string; to: string } {
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - (Number(range) - 1));
  return { from: start.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
}
