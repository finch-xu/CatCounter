import { i18n } from '../i18n';

/** 接入代码里的示例文字跟随当前界面语言；在模板里调用时切换语言会自动重新渲染 */
export function snippetFor(token: string): string {
  const { t } = i18n.global;
  const endpoint = location.origin;
  const span = (key: string) => `<span data-cc="${key}">-</span>`;
  return [
    `<script async src="${endpoint}/catcounter.js" data-token="${token}"></script>`,
    `<!-- ${t('snippet.comment')} -->`,
    t('snippet.siteLine', { pv: span('site_pv'), uv: span('site_uv') }),
    t('snippet.pageLine', { pv: span('page_pv') }),
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
