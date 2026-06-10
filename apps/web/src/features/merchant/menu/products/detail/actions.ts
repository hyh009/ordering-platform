import type { Product } from '@/models/product';
import type { ProductDetailStore } from './store';

export function createProductDetailActions(store: ProductDetailStore) {
  return {
    loadStarted() {
      store.setState({ isLoading: true, error: null });
    },

    loadSucceeded(product: Product) {
      store.setState({ product, isLoading: false });
    },

    loadFailed(error: string) {
      store.setState({ isLoading: false, error });
    },

    productChanged(product: Product) {
      store.setState({ product });
    },
  };
}

export type ProductDetailActions = ReturnType<typeof createProductDetailActions>;
