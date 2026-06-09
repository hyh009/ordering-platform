import type { Store } from '@/models/store';
import type { StoreDetailStore } from './store';

export function createStoreDetailActions(storeInstance: StoreDetailStore) {
  return {
    loadStarted() {
      storeInstance.setState({ isLoading: true, error: null });
    },

    loadSucceeded(store: Store) {
      storeInstance.setState({ store, isLoading: false, error: null });
    },

    loadFailed(error: string) {
      storeInstance.setState({ isLoading: false, error });
    },
  };
}

export type StoreDetailActions = ReturnType<typeof createStoreDetailActions>;
