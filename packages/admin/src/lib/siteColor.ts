export const SITE_COLORS = ['#d97757', '#2f5d7c', '#e3b34d', '#7d9a78', '#8a6fa8', '#5b8f8f'] as const;

/** 按站点在列表中的顺序循环取色 */
export function siteColor(index: number): string {
  return SITE_COLORS[((index % SITE_COLORS.length) + SITE_COLORS.length) % SITE_COLORS.length]!;
}
