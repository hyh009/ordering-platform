import type { StoreListItem } from '@/models/store';
import type { StoreListStore } from './store';

export function createStoreListActions(storeInstance: StoreListStore) {
  return {
    setLoading() {
      storeInstance.setState({ isLoading: true, error: null });
    },

    setStores(stores: StoreListItem[]) {
      storeInstance.setState({ stores, isLoading: false, error: null });
    },

    setError(error: string) {
      storeInstance.setState({ isLoading: false, error });
    },
  };
}
