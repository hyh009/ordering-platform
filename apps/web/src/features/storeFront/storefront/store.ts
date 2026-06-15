import { createStore } from 'zustand/vanilla';
import type { PublicMenu, PublicStore } from '@/models/storeFrontMenu';

export type StorefrontState = {
  store: PublicStore | null;
  menu: PublicMenu | null;
  error: string | null;
  isLoading: boolean;
};

export function createStorefrontStore() {
  return createStore<StorefrontState>(() => ({
    store: null,
    menu: null,
    error: null,
    isLoading: false,
  }));
}

export type StorefrontStore = ReturnType<
  typeof createStorefrontStore
>;
