import { createStore } from 'zustand/vanilla';
import type { Store } from '@/models/store';

export type StoreSettingsState = {
  store: Store | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
};

export function createStoreSettingsStore() {
  return createStore<StoreSettingsState>(() => ({
    store: null,
    isLoading: false,
    isSaving: false,
    error: null,
  }));
}

export type StoreSettingsStore = ReturnType<typeof createStoreSettingsStore>;
