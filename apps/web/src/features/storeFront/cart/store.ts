import { createStore } from 'zustand/vanilla';
import type { Cart } from '@/models/cart';

export type StoreFrontCartState = {
  cart: Cart | null;
  error: string | null;
  isLoading: boolean;
  isMutating: boolean;
};

export function createStoreFrontCartStore() {
  return createStore<StoreFrontCartState>(() => ({
    cart: null,
    error: null,
    isLoading: false,
    isMutating: false,
  }));
}

export type StoreFrontCartStore = ReturnType<typeof createStoreFrontCartStore>;
