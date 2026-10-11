import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import ja from './locales/ja';
import zhCN from './locales/zh-CN';

export const LOCALES = [
  { label: 'English', value: 'en' },
  { label: '日本語', value: 'ja' },
  { label: '简体中文', value: 'zh-CN' },
] as const;
export type Locale = (typeof LOCALES)[number]['value'];

const KEY = 'cc-lang';
const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(v: unknown): v is Locale {
  return LOCALES.some((l) => l.value === v);
}

/** 首次访问一律英文，之后沿用用户在界面上选过的语言 */
export function loadLocale(): Locale {
  try {
    const v = localStorage.getItem(KEY);
    return isLocale(v) ? v : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export const i18n = i18next.createInstance();

function sync(locale: string): void {
  document.documentElement.lang = locale;
  try {
    localStorage.setItem(KEY, locale);
  } catch {
    // 忽略
  }
}

i18n.on('languageChanged', sync);

void i18n.use(initReactI18next).init({
  lng: loadLocale(),
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: LOCALES.map((l) => l.value),
  resources: { en: { translation: en }, ja: { translation: ja }, 'zh-CN': { translation: zhCN } },
  // 语言文件沿用单花括号占位符；React 自己负责转义，接入代码里还要输出标签
  interpolation: { prefix: '{', suffix: '}', escapeValue: false },
  initAsync: false,
});
sync(i18n.language);
