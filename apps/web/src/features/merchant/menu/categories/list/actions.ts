import type { Category } from '@/models/category';
import type { CategoryListState } from './store';
import type { StoreApi } from 'zustand/vanilla';

export function createCategoryListActions(store: StoreApi<CategoryListState>) {
  return {
    loadStarted() {
      store.setState({
        error: null,
        isLoading: true,
      });
    },

    loadSucceeded(categories: Category[]) {
      store.setState({
        categories,
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

    categoriesReordered(orderedIds: string[]) {
      store.setState((state) => {
        const byId = new Map(state.categories.map((c) => [c.id, c]));
        const reordered = orderedIds
          .map((id, index) => {
            const category = byId.get(id);
            return category ? { ...category, displayOrder: index } : null;
          })
          .filter((c): c is Category => c !== null);

        return { categories: reordered };
      });
    },

    categoryProductsReordered(categoryId: string, orderedIds: string[]) {
      store.setState((state) => ({
        categories: state.categories.map((category) =>
          category.id === categoryId
            ? { ...category, productOrder: orderedIds }
            : category,
        ),
      }));
    },
  };
}

export type CategoryListActions = ReturnType<typeof createCategoryListActions>;
