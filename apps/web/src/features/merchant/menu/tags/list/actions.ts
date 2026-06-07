import type { Tag } from '@/models/tag';
import type { StoreApi } from 'zustand/vanilla';
import type { TagListState } from './store';

export function createTagListActions(store: StoreApi<TagListState>) {
  return {
    loadStarted() {
      store.setState({
        error: null,
        isLoading: true,
      });
    },

    loadSucceeded(tags: Tag[]) {
      store.setState({
        tags,
        error: null,
        isLoading: false,
      });
    },

    loadFailed(error: string) {
      store.setState({
        error,
        isLoading: false,
      });
    },
  };
}

export type TagListActions = ReturnType<typeof createTagListActions>;
