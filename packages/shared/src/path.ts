/**
 * 规范化页面路径：
 * - 去掉 query 与 hash
 * - 百分号解码（失败则保留原样）
 * - 合并连续斜杠
 * - 去掉结尾的 index.html / index.htm
 * - 末段不含扩展名时补结尾斜杠；根路径为 "/"
 */
export function normalizePath(input: string): string {
  let p = (input || '/').split('?')[0].split('#')[0];
  try {
    p = decodeURIComponent(p);
  } catch {
    // 保留原样
  }
  if (!p.startsWith('/')) p = '/' + p;
  p = p.replace(/\/{2,}/g, '/');
  p = p.replace(/\/index\.html?$/i, '/');
  if (p === '/') return p;
  const last = p.slice(p.lastIndexOf('/') + 1);
  if (last !== '' && !last.includes('.')) p += '/';
  return p;
}
