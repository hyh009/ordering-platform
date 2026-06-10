import type { Product } from '@/models/product';
import type { ProductListStore } from './store';

export function createProductListActions(store: ProductListStore) {
  return {
    loadStarted() {
      store.setState({
        error: null,
        isLoading: true,
      });
    },

    loadSucceeded(products: Product[]) {
      store.setState({
        products,
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

    productSaved(product: Product) {
      store.setState((state) => {
        const index = state.products.findIndex(
          (existing) => existing.id === product.id,
        );

        if (index === -1) {
          return { products: [...state.products, product] };
        }

        const products = [...state.products];
        products[index] = product;
        return { products };
      });
    },
  };
}

export type ProductListActions = ReturnType<typeof createProductListActions>;
