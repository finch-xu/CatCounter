import { watchEffect } from 'vue';
import { createI18n } from 'vue-i18n';
import en from './locales/en';
import ja from './locales/ja';
import zhCN from './locales/zh-CN';
import type { MessageSchema } from './schema';

export const LOCALES = [
  { label: 'English', value: 'en' },
  { label: '日本語', value: 'ja' },
  { label: '简体中文', value: 'zh-CN' },
] as const;
export type Locale = (typeof LOCALES)[number]['value'];

const KEY = 'cc-lang';
const DEFAULT_LOCALE: Locale = 'en';

function isLocale(v: unknown): v is Locale {
  return LOCALES.some((l) => l.value === v);
}

/** 首次访问一律英文，之后沿用用户在界面上选过的语言 */
function load(): Locale {
  try {
    const v = localStorage.getItem(KEY);
    return isLocale(v) ? v : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

const dateTimeFormat = {
  long: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' },
} as const;

export const i18n = createI18n<[MessageSchema], Locale, false>({
  legacy: false,
  locale: load(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: { en, ja, 'zh-CN': zhCN },
  datetimeFormats: { en: dateTimeFormat, ja: dateTimeFormat, 'zh-CN': dateTimeFormat },
});

watchEffect(() => {
  const locale = i18n.global.locale.value;
  document.documentElement.lang = locale;
  try {
    localStorage.setItem(KEY, locale);
  } catch {
    // 忽略
  }
});

declare module 'vue-i18n' {
  export interface DefineLocaleMessage extends MessageSchema {}
}
