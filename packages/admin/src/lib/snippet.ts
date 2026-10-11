import { i18n } from '@/i18n';

/** 接入代码里的示例文字跟随当前界面语言 */
export function snippetFor(token: string): string {
  const endpoint = location.origin;
  const span = (key: string) => `<span data-cc="${key}">-</span>`;
  return [
    `<script async src="${endpoint}/catcounter.js" data-token="${token}"></script>`,
    `<!-- ${i18n.t('snippet.comment')} -->`,
    i18n.t('snippet.siteLine', { pv: span('site_pv'), uv: span('site_uv') }),
    i18n.t('snippet.pageLine', { pv: span('page_pv') }),
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
