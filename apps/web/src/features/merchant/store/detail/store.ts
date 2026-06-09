import { createStore } from 'zustand/vanilla';
import type { Store } from '@/models/store';

export type StoreDetailState = {
  store: Store | null;
  isLoading: boolean;
  error: string | null;
};

export function createStoreDetailStore() {
  return createStore<StoreDetailState>(() => ({
    store: null,
    isLoading: false,
    error: null,
  }));
}

export type StoreDetailStore = ReturnType<typeof createStoreDetailStore>;
