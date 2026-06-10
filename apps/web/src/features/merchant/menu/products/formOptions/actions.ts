import type { ProductFormOptions, ProductFormOptionsStore } from './store';

export function createProductFormOptionsActions(
  store: ProductFormOptionsStore,
) {
  return {
    loadStarted() {
      store.setState({ isLoading: true, error: null });
    },

    loadSucceeded(data: Omit<ProductFormOptions, 'isLoading' | 'error'>) {
      store.setState({ ...data, isLoading: false, error: null });
    },

    loadFailed(error: string) {
      store.setState({ isLoading: false, error });
    },
  };
}

export type ProductFormOptionsActions = ReturnType<
  typeof createProductFormOptionsActions
>;
