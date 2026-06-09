import type { Store } from '@/models/store';
import type { StoreSettingsStore } from './store';

export function createStoreSettingsActions(storeInstance: StoreSettingsStore) {
  return {
    setLoading() {
      storeInstance.setState({ isLoading: true, error: null });
    },

    setStore(store: Store) {
      storeInstance.setState({ store, isLoading: false, error: null });
    },

    setSaving() {
      storeInstance.setState({ isSaving: true, error: null });
    },

    setSaved(store: Store) {
      storeInstance.setState({ store, isSaving: false, error: null });
    },

    setError(error: string) {
      storeInstance.setState({ isLoading: false, isSaving: false, error });
    },
  };
}
