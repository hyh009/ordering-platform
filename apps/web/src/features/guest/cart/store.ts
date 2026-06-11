import { createStore } from 'zustand/vanilla';
import type { Cart } from '@/models/cart';

export type GuestCartState = {
  cart: Cart | null;
  error: string | null;
  isLoading: boolean;
  isMutating: boolean;
};

export function createGuestCartStore() {
  return createStore<GuestCartState>(() => ({
    cart: null,
    error: null,
    isLoading: false,
    isMutating: false,
  }));
}

export type GuestCartStore = ReturnType<typeof createGuestCartStore>;
