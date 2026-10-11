/** 站点配色的数量；具体色值在 index.css 的 --site-N 里，深色模式下有单独的取值 */
export const SITE_COLOR_COUNT = 6;

/** 按站点在列表中的顺序循环取色 */
export function siteColor(index: number): string {
  const i = ((index % SITE_COLOR_COUNT) + SITE_COLOR_COUNT) % SITE_COLOR_COUNT;
  return `var(--site-${i + 1})`;
}
