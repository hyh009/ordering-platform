import { useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { changeLanguageTransient } from '@/app/i18n';
import { isSupportedLanguage } from '@/app/i18n/languages';
import type { SupportedLanguage } from '@/app/i18n/languages';
import { getStoreFrontRuntime } from '../runtime';
import { getStorefrontLangKey } from './storefrontLanguage.storage';
import { useStorefrontSupportedLanguages } from './useStorefrontSupportedLanguages';

export function useStorefrontLanguagePrompt() {
  const runtime = getStoreFrontRuntime();
  const store = useStore(runtime.stores.storefront, (s) => s.store);
  const activeStoreId = useStore(runtime.stores.tenant, (s) => s.activeStoreId);
  const [dismissed, setDismissed] = useState(false);

  // Apply the saved or single-language preference silently.
  useEffect(() => {
    if (!store || !activeStoreId) return;
    const supported = store.locale.supportedLocales as string[];

    if (supported.length <= 1) {
      const only = supported[0] ?? store.locale.defaultLocale;
      localStorage.setItem(getStorefrontLangKey(activeStoreId), only);
      if (isSupportedLanguage(only)) void changeLanguageTransient(only);
      return;
    }

    const saved = localStorage.getItem(getStorefrontLangKey(activeStoreId));
    if (saved && isSupportedLanguage(saved) && supported.includes(saved)) {
      void changeLanguageTransient(saved);
    }
  }, [store, activeStoreId]);

  // Derive open from store + localStorage — no setState inside effect.
  const open = useMemo(() => {
    if (!store || !activeStoreId || dismissed) return false;
    const supported = store.locale.supportedLocales as string[];
    if (supported.length <= 1) return false;
    const saved = localStorage.getItem(getStorefrontLangKey(activeStoreId));
    return !saved || !isSupportedLanguage(saved) || !supported.includes(saved);
  }, [store, activeStoreId, dismissed]);

  const supportedOptions = useStorefrontSupportedLanguages();

  function handleSelect(lang: SupportedLanguage) {
    if (activeStoreId) {
      localStorage.setItem(getStorefrontLangKey(activeStoreId), lang);
    }
    void changeLanguageTransient(lang);
    setDismissed(true);
  }

  // A language must be explicitly selected — closing via Escape or a
  // backdrop click is intentionally not honored here.
  function onOpenChange() {}

  return { open, supportedOptions, handleSelect, onOpenChange };
}
