import { createStore } from 'zustand/vanilla';
import type { Allergen } from '@/models/metadata';

export type AllergenListState = {
  allergens: Allergen[];
  error: string | null;
  isLoading: boolean;
};

export function createAllergenListStore() {
  return createStore<AllergenListState>(() => ({
    allergens: [],
    error: null,
    isLoading: false,
  }));
}
