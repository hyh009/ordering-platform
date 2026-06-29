import { createStore } from 'zustand/vanilla';
import type { Order } from '@/models/order';

export type OrderDetailState = {
  order: Order | null;
  isLoading: boolean;
  error: string | null;
  /**
   * Unix timestamp (ms) when the order was last loaded from the server.
   * Set on initial load success, mutation success, and conflict auto-reload.
   */
  lastLoadedAt: number | null;
};

export function createOrderDetailStore() {
  return createStore<OrderDetailState>(() => ({
    order: null,
    isLoading: false,
    error: null,
    lastLoadedAt: null,
  }));
}

export type OrderDetailStore = ReturnType<typeof createOrderDetailStore>;
