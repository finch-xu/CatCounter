export function snippetFor(token: string): string {
  const endpoint = location.origin;
  return [
    `<script async src="${endpoint}/catcounter.js" data-token="${token}"></script>`,
    `<!-- 占位元素，放在需要显示数字的位置 -->`,
    `本站访问 <span data-cc="site_pv">-</span> 次，访客 <span data-cc="site_uv">-</span> 人`,
    `本文阅读 <span data-cc="page_pv">-</span> 次`,
  ].join('\n');
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
