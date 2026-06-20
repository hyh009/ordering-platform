import { useStore } from 'zustand';
import { changeLanguageTransient, useAppTranslation } from '@/app/i18n';
import { defaultLanguage, isSupportedLanguage } from '@/app/i18n/languages';
import type { SupportedLanguage } from '@/app/i18n/languages';
import { getStoreFrontRuntime } from '../runtime';
import { getStorefrontLangKey } from './storefrontLanguage.storage';
import { useStorefrontSupportedLanguages } from './useStorefrontSupportedLanguages';

export function useStorefrontHeaderMenu() {
  const { language } = useAppTranslation();
  const runtime = getStoreFrontRuntime();
  const activeStoreId = useStore(runtime.stores.tenant, (s) => s.activeStoreId);

  const currentLanguage = isSupportedLanguage(language) ? language : defaultLanguage;
  const supportedOptions = useStorefrontSupportedLanguages();

  function handleLanguageSelect(lang: SupportedLanguage) {
    if (activeStoreId) {
      localStorage.setItem(getStorefrontLangKey(activeStoreId), lang);
    }
    void changeLanguageTransient(lang);
  }

  return {
    currentLanguage,
    languageOptions: supportedOptions.length >= 2 ? supportedOptions : [],
    handleLanguageSelect,
  };
}
