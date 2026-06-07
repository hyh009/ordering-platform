import type { ProductModifierListState } from './store';
import type { StoreApi } from 'zustand/vanilla';
import type { ProductModifier } from '@/models/productModifier';

export function createProductModifierListActions(
  store: StoreApi<ProductModifierListState>,
) {
  return {
    loadStarted() {
      store.setState({
        error: null,
        isLoading: true,
      });
    },

    loadSucceeded(productModifiers: ProductModifier[]) {
      store.setState({
        productModifiers,
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

export type ProductModifierListActions = ReturnType<
  typeof createProductModifierListActions
>;
