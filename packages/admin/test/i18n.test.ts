import { beforeEach, describe, expect, it } from 'vitest';
import { i18n, isLocale } from '@/i18n';
import en from '@/i18n/locales/en';
import ja from '@/i18n/locales/ja';
import zhCN from '@/i18n/locales/zh-CN';

const keys = (o: object, prefix = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

describe('语言文件', () => {
  it('三份文件的键完全一致', () => {
    expect(keys(ja).sort()).toEqual(keys(en).sort());
    expect(keys(zhCN).sort()).toEqual(keys(en).sort());
  });
});

describe('i18next 配置', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); });

  it('单花括号插值', () => {
    expect(i18n.t('site.days', { n: 7 })).toBe('7 days');
    expect(i18n.t('errors.requestFailed', { status: 502 })).toBe('Request failed (502)');
  });
  it('插值不做 HTML 转义（接入代码里有标签）', () => {
    expect(i18n.t('snippet.pageLine', { pv: '<span>-</span>' })).toContain('<span>-</span>');
  });
  it('复数：0、1、多个', () => {
    expect(i18n.t('details.total', { count: 0 })).toBe('No pages');
    expect(i18n.t('details.total', { count: 1 })).toBe('1 page');
    expect(i18n.t('details.total', { count: 186 })).toBe('186 pages');
  });
  it('中文没有单复数之分，但 0 仍有专门文案', async () => {
    await i18n.changeLanguage('zh-CN');
    expect(i18n.t('details.total', { count: 0 })).toBe('没有页面');
    expect(i18n.t('details.total', { count: 186 })).toBe('共 186 个页面');
  });
  it('切换语言会写入 cc-lang 并更新 <html lang>', async () => {
    await i18n.changeLanguage('ja');
    expect(localStorage.getItem('cc-lang')).toBe('ja');
    expect(document.documentElement.lang).toBe('ja');
  });
  it('isLocale 只接受三种语言', () => {
    expect(['en', 'ja', 'zh-CN'].every(isLocale)).toBe(true);
    expect(['fr', '', null, 'zh'].some(isLocale)).toBe(false);
  });
});
