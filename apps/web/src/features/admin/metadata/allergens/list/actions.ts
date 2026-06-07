import type { Allergen } from '@/models/metadata';
import type { AllergenListState } from './store';
import type { StoreApi } from 'zustand/vanilla';

export function createAllergenListActions(store: StoreApi<AllergenListState>) {
  return {
    loadStarted() {
      store.setState({
        error: null,
        isLoading: true,
      });
    },

    loadSucceeded(allergens: Allergen[]) {
      store.setState({
        allergens,
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

export type AllergenListActions = ReturnType<typeof createAllergenListActions>;
