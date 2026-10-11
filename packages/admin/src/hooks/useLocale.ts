import { useTranslation } from 'react-i18next';
import { isLocale, type Locale } from '@/i18n';

export function useLocale() {
  const { i18n } = useTranslation();
  const locale: Locale = isLocale(i18n.language) ? i18n.language : 'en';
  return { locale, setLocale: (l: Locale) => void i18n.changeLanguage(l) };
}
