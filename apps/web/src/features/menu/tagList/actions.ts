import type { Tag } from '@/models/tag';
import type { TagListState } from './store';
import type { StoreApi } from 'zustand/vanilla';

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

    tagSaved(tag: Tag) {
      store.setState((state) => {
        const exists = state.tags.some((item) => item.id === tag.id);

        return {
          tags: exists
            ? state.tags.map((item) => (item.id === tag.id ? tag : item))
            : [tag, ...state.tags],
        };
      });
    },
  };
}

export type TagListActions = ReturnType<typeof createTagListActions>;
