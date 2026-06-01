import { createStore } from 'zustand/vanilla';
import type { Store } from '@/models/store';

export type StoreListState = {
  stores: Store[];
  isLoading: boolean;
  error: string | null;
};

export function createStoreListStore() {
  return createStore<StoreListState>(() => ({
    stores: [],
    isLoading: false,
    error: null,
  }));
}

export type StoreListStore = ReturnType<typeof createStoreListStore>;
