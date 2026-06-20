import { useMemo } from 'react';
import { useStore } from 'zustand';
import { languageOptions } from '@/app/i18n/languages';
import { getStoreFrontRuntime } from '../runtime';

export function useStorefrontSupportedLanguages() {
  const runtime = getStoreFrontRuntime();
  const store = useStore(runtime.stores.storefront, (s) => s.store);

  return useMemo(
    () =>
      languageOptions.filter((opt) =>
        (store?.locale.supportedLocales as string[] | undefined)?.includes(opt.value),
      ),
    [store],
  );
}
