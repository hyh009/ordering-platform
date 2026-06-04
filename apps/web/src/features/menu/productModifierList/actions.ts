import type { ProductModifier } from '@/models/productModifier';
import type { ProductModifierListState } from './store';
import type { StoreApi } from 'zustand/vanilla';

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

    modifierSaved(modifier: ProductModifier) {
      store.setState((state) => {
        const idx = state.productModifiers.findIndex((m) => m.id === modifier.id);

        if (idx === -1) {
          return { productModifiers: [...state.productModifiers, modifier] };
        }

        const productModifiers = [...state.productModifiers];

        productModifiers[idx] = modifier;
        return { productModifiers };
      });
    },
  };
}

export type ProductModifierListActions = ReturnType<typeof createProductModifierListActions>;
