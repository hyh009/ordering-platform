import type { ProductModifier } from '@/models/productModifier';
import type { ProductModifierDetailStore } from './store';

export function createProductModifierDetailActions(
  store: ProductModifierDetailStore,
) {
  return {
    loadStarted() {
      store.setState({ isLoading: true, error: null });
    },

    loadSucceeded(modifier: ProductModifier) {
      store.setState({ modifier, isLoading: false });
    },

    loadFailed(error: string) {
      store.setState({ isLoading: false, error });
    },

    modifierUpdated(modifier: ProductModifier) {
      store.setState({ modifier });
    },
  };
}

export type ProductModifierDetailActions = ReturnType<
  typeof createProductModifierDetailActions
>;
