import { createStore } from 'zustand/vanilla';
import type { PublicMenu, PublicStore } from '@/models/guestMenu';

export type GuestStorefrontState = {
  store: PublicStore | null;
  menu: PublicMenu | null;
  error: string | null;
  isLoading: boolean;
};

export function createGuestStorefrontStore() {
  return createStore<GuestStorefrontState>(() => ({
    store: null,
    menu: null,
    error: null,
    isLoading: false,
  }));
}

export type GuestStorefrontStore = ReturnType<
  typeof createGuestStorefrontStore
>;
