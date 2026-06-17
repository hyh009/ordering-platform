import type { StoreLocaleDto } from '@/models/store';
import { activeStoreActions } from './activeStore.actions';
import { activeStoreStore } from './activeStore.store';

type StoredActiveStore = {
  storeId: string;
  storeName?: string;
  organizationId: string;
  locale?: StoreLocaleDto;
};

const STORAGE_KEY = 'activeStore';

export const activeStoreCommands = {
  initialize(activeOrgId: string | null) {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw || !activeOrgId) {
      activeStoreActions.clearStore();
      return;
    }

    try {
      const parsed = JSON.parse(raw) as StoredActiveStore;

      if (parsed.organizationId === activeOrgId) {
        activeStoreActions.setStore(
          parsed.storeId,
          parsed.storeName ?? '',
          parsed.organizationId,
          parsed.locale ?? null,
        );
      } else {
        localStorage.removeItem(STORAGE_KEY);
        activeStoreActions.clearStore();
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      activeStoreActions.clearStore();
    }
  },

  setStore(
    storeId: string,
    storeName: string,
    organizationId: string,
    locale: StoreLocaleDto | null,
  ) {
    const value: StoredActiveStore = {
      storeId,
      storeName,
      organizationId,
      locale: locale ?? undefined,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    activeStoreActions.setStore(storeId, storeName, organizationId, locale);
  },

  // Refresh the cached locale after the active store's settings change, so
  // localized inputs/views stay in sync without re-selecting the store.
  setLocale(storeId: string, locale: StoreLocaleDto) {
    const {
      storeId: activeId,
      storeName,
      organizationId,
    } = activeStoreStore.getState();
    if (activeId !== storeId || !organizationId) return;

    const value: StoredActiveStore = {
      storeId,
      storeName: storeName ?? undefined,
      organizationId,
      locale,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    activeStoreActions.setLocale(locale);
  },

  clearStore() {
    localStorage.removeItem(STORAGE_KEY);
    activeStoreActions.clearStore();
  },
};
