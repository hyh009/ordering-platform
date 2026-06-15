import { createStore } from 'zustand/vanilla';
import type { Order } from '@/models/order';

export type StoreFrontOrderState = {
  order: Order | null;
  error: string | null;
  isLoading: boolean;
};

export function createStoreFrontOrderStore() {
  return createStore<StoreFrontOrderState>(() => ({
    order: null,
    error: null,
    isLoading: false,
  }));
}

export type StoreFrontOrderStore = ReturnType<typeof createStoreFrontOrderStore>;
