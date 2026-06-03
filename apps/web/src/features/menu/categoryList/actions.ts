import type { Category } from '@/models/category';
import type { CategoryListState } from './store';
import type { StoreApi } from 'zustand/vanilla';

// Mirror the backend list order ({ displayOrder, createdAt, id }) so an upserted
// category lands in the right place without waiting for a reload. createdAt is an
// ISO string, so lexical comparison preserves chronological order.
function byDisplayOrder(left: Category, right: Category) {
  return (
    left.displayOrder - right.displayOrder ||
    left.createdAt.localeCompare(right.createdAt) ||
    left.id.localeCompare(right.id)
  );
}

export function createCategoryListActions(
  store: StoreApi<CategoryListState>,
) {
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

    categorySaved(category: Category) {
      store.setState((state) => {
        const exists = state.categories.some((item) => item.id === category.id);
        const categories = exists
          ? state.categories.map((item) =>
              item.id === category.id ? category : item,
            )
          : [...state.categories, category];

        return {
          categories: [...categories].sort(byDisplayOrder),
        };
      });
    },
  };
}

export type CategoryListActions = ReturnType<typeof createCategoryListActions>;
