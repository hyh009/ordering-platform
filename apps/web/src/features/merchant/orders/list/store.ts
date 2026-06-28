import { createStore } from 'zustand/vanilla';
import type { OrderSummary } from '@/models/order';

export type OrderListState = {
  orders: OrderSummary[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  error: string | null;
};

export function createOrderListStore() {
  return createStore<OrderListState>(() => ({
    orders: [],
    total: 0,
    page: 1,
    pageSize: 20,
    isLoading: false,
    error: null,
  }));
}

export type OrderListStore = ReturnType<typeof createOrderListStore>;
