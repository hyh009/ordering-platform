import { createStore } from 'zustand/vanilla';
import type { StoreFrontOrderHistoryEntry, StoreFrontOrderHistoryItem } from './types';

export type StoreFrontOrderHistoryState = {
  storeId: string | null;
  entries: StoreFrontOrderHistoryEntry[];
  items: StoreFrontOrderHistoryItem[];
  error: string | null;
  isLoading: boolean;
};

export function createStoreFrontOrderHistoryStore() {
  return createStore<StoreFrontOrderHistoryState>(() => ({
    storeId: null,
    entries: [],
    items: [],
    error: null,
    isLoading: false,
  }));
}

export type StoreFrontOrderHistoryStore = ReturnType<
  typeof createStoreFrontOrderHistoryStore
>;
