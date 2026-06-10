import { createStore } from 'zustand/vanilla';
import type { Product } from '@/models/product';

export type ProductDetailState = {
  product: Product | null;
  isLoading: boolean;
  error: string | null;
};

export function createProductDetailStore() {
  return createStore<ProductDetailState>(() => ({
    product: null,
    isLoading: false,
    error: null,
  }));
}

export type ProductDetailStore = ReturnType<typeof createProductDetailStore>;
