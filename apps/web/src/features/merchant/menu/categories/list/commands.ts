import type { CategoryActiveFilter } from '@/models/category';
import { categoryService } from '@/services/category.service';
import {
  mapMerchantApiError,
  type MerchantCommandFailure,
} from '@/services/utils/merchantApiError';
import type { CategoryListActions } from './actions';

export type LoadCategoriesResult =
  | {
      status: 'loaded';
    }
  | MerchantCommandFailure;

export type ReorderCategoriesResult =
  | { status: 'reordered' }
  | MerchantCommandFailure;

export type CategoryListCommands = {
  loadCategories(
    storeId: string,
    isActive: CategoryActiveFilter,
  ): Promise<LoadCategoriesResult>;
  reorderCategories(
    storeId: string,
    orderedIds: string[],
  ): Promise<ReorderCategoriesResult>;
};

export function createCategoryListCommands(
  actions: CategoryListActions,
): CategoryListCommands {
  return {
    async loadCategories(storeId, isActive) {
      actions.loadStarted();

      try {
        const categories = await categoryService.listCategories(
          storeId,
          isActive,
        );

        actions.loadSucceeded(categories);
        return {
          status: 'loaded',
        };
      } catch (error) {
        const failure = mapMerchantApiError(error);

        actions.loadFailed(failure.message);
        return failure;
      }
    },

    async reorderCategories(storeId, orderedIds) {
      try {
        await categoryService.reorderCategories(storeId, orderedIds);
        actions.categoriesReordered(orderedIds);
        return { status: 'reordered' };
      } catch (error) {
        return mapMerchantApiError(error);
      }
    },
  };
}
