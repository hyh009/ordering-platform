import { createStore } from 'zustand/vanilla';
import type { Order } from '@/models/order';

export type OrderDetailState = {
  order: Order | null;
  isLoading: boolean;
  error: string | null;
};

export function createOrderDetailStore() {
  return createStore<OrderDetailState>(() => ({
    order: null,
    isLoading: false,
    error: null,
  }));
}

export type OrderDetailStore = ReturnType<typeof createOrderDetailStore>;
