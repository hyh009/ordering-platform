import { createStore } from 'zustand/vanilla';
import type { Order } from '@/models/order';

export type GuestOrderState = {
  order: Order | null;
  error: string | null;
  isLoading: boolean;
};

export function createGuestOrderStore() {
  return createStore<GuestOrderState>(() => ({
    order: null,
    error: null,
    isLoading: false,
  }));
}

export type GuestOrderStore = ReturnType<typeof createGuestOrderStore>;
