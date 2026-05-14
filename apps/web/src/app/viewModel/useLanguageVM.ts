import { useAppTranslation } from '@/app/i18n';
import {
  defaultLanguage,
  isSupportedLanguage,
  languageOptions,
} from '@/app/i18n/languages';

export function useLanguageVM() {
  const { changeLanguage, language } = useAppTranslation();
  const currentLanguage = isSupportedLanguage(language)
    ? language
    : defaultLanguage;

  return {
    async changeLanguage(language: string) {
      await changeLanguage(language);
    },
    currentLanguage,
    languageOptions,
  };
}
