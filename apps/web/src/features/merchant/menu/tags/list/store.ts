import { createStore } from 'zustand/vanilla';
import type { Tag } from '@/models/tag';

export type TagListState = {
  tags: Tag[];
  error: string | null;
  isLoading: boolean;
};

export function createTagListStore() {
  return createStore<TagListState>(() => ({
    tags: [],
    error: null,
    isLoading: false,
  }));
}
