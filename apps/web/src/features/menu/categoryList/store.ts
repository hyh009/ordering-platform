import { createStore } from 'zustand/vanilla';
import type { Category } from '@/models/category';

export type CategoryListState = {
  categories: Category[];
  error: string | null;
  isLoading: boolean;
};

export function createCategoryListStore() {
  return createStore<CategoryListState>(() => ({
    categories: [],
    error: null,
    isLoading: false,
  }));
}
