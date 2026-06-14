import { createStore } from 'zustand/vanilla';
import type { GuestOrderHistoryEntry, GuestOrderHistoryItem } from './types';

export type GuestOrderHistoryState = {
  storeId: string | null;
  entries: GuestOrderHistoryEntry[];
  items: GuestOrderHistoryItem[];
  error: string | null;
  isLoading: boolean;
};

export function createGuestOrderHistoryStore() {
  return createStore<GuestOrderHistoryState>(() => ({
    storeId: null,
    entries: [],
    items: [],
    error: null,
    isLoading: false,
  }));
}

export type GuestOrderHistoryStore = ReturnType<
  typeof createGuestOrderHistoryStore
>;
