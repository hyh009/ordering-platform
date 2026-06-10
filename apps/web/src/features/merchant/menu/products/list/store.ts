import { createStore } from 'zustand/vanilla';
import type { Product } from '@/models/product';

export type ProductListState = {
  products: Product[];
  error: string | null;
  isLoading: boolean;
};

export function createProductListStore() {
  return createStore<ProductListState>(() => ({
    products: [],
    error: null,
    isLoading: false,
  }));
}

export type ProductListStore = ReturnType<typeof createProductListStore>;
