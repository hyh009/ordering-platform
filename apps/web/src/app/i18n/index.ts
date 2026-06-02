import i18n, { type TOptions } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next, useTranslation } from 'react-i18next';
import {
  defaultLanguage,
  isSupportedLanguage,
  languageStorageKey,
  supportedLanguages,
} from './languages';
import { resources } from './resources';

type DefaultTranslationOptions = TOptions & {
  defaultValue?: never;
};

export type AppTranslator = (
  key: string,
  defaultValue: string,
  options?: DefaultTranslationOptions,
) => string;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    cleanCode: true,
    detection: {
      caches: ['localStorage'],
      lookupLocalStorage: languageStorageKey,
      order: ['localStorage', 'navigator'],
    },
    fallbackLng: defaultLanguage,
    interpolation: {
      escapeValue: false,
    },
    load: 'currentOnly',
    resources,
    supportedLngs: [...supportedLanguages],
  });

export function tDefault(
  key: string,
  defaultValue: string,
  options?: DefaultTranslationOptions,
): string {
  return i18n.t(key, {
    ...options,
    defaultValue,
  });
}

export function useAppTranslation() {
  const { i18n: i18nInstance, t } = useTranslation();

  return {
    changeLanguage(language: string) {
      if (!isSupportedLanguage(language)) {
        return Promise.resolve();
      }

      return i18nInstance.changeLanguage(language);
    },
    language: i18nInstance.resolvedLanguage ?? i18nInstance.language,
    tDefault(
      key: string,
      defaultValue: string,
      options?: DefaultTranslationOptions,
    ): string {
      return t(key, {
        ...options,
        defaultValue,
      });
    },
  };
}

export { i18n };
