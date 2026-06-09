import { useStore } from 'zustand';
import { supportedLocales } from '@/models/metadata';
import type { StoreLocaleDto } from '@/models/store';
import { activeStoreStore } from './activeStore.store';

// Used before a store is selected, or to rehydrate sessions persisted before
// the active store began tracking locale. Mirrors the store-create defaults.
const FALLBACK_LOCALE: StoreLocaleDto = {
  defaultLocale: 'zh-TW',
  supportedLocales: [...supportedLocales],
};

/**
 * The active store's locale config (default + supported locales). Drives
 * localized inputs/views so they follow the store's configured languages
 * instead of a hardcoded default.
 */
export function useActiveStoreLocale(): StoreLocaleDto {
  const locale = useStore(activeStoreStore, (state) => state.locale);
  return locale ?? FALLBACK_LOCALE;
}
