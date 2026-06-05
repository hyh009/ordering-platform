import { createStore } from 'zustand/vanilla';
import type { ProductModifier } from '@/models/productModifier';

export type ProductModifierDetailState = {
  modifier: ProductModifier | null;
  isLoading: boolean;
  error: string | null;
};

export function createProductModifierDetailStore() {
  return createStore<ProductModifierDetailState>(() => ({
    modifier: null,
    isLoading: false,
    error: null,
  }));
}

export type ProductModifierDetailStore = ReturnType<
  typeof createProductModifierDetailStore
>;
