import { createStore } from 'zustand/vanilla';
import type { ProductModifier } from '@/models/productModifier';

export type ProductModifierListState = {
  productModifiers: ProductModifier[];
  error: string | null;
  isLoading: boolean;
};

export function createProductModifierListStore() {
  return createStore<ProductModifierListState>(() => ({
    productModifiers: [],
    error: null,
    isLoading: false,
  }));
}
