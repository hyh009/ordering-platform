import type { Allergen } from '@/models/metadata.types';
import type { AllergenListState } from '@/features/metadata/store/allergenList.store';
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

    allergenSaved(allergen: Allergen) {
      store.setState((state) => {
        const exists = state.allergens.some((item) => item.id === allergen.id);

        return {
          allergens: exists
            ? state.allergens.map((item) =>
                item.id === allergen.id ? allergen : item,
              )
            : [allergen, ...state.allergens],
        };
      });
    },
  };
}

export type AllergenListActions = ReturnType<typeof createAllergenListActions>;
