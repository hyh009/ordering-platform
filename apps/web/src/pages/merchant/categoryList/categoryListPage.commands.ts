import type { CategoryListActions } from '@/features/menu/categories/list/actions';
import {
  createCategoryListCommands,
  type CategoryListCommands,
  type LoadCategoriesResult,
  type ReorderCategoriesResult,
} from '@/features/menu/categories/list/commands';
import {
  createCategoryMutationCommands,
  type SaveCategoryResult,
} from '@/features/menu/categories/mutations/commands';
import type {
  CategoryActiveFilter,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@/models/category';

export type {
  LoadCategoriesResult,
  ReorderCategoriesResult,
  SaveCategoryResult,
};

export type CategoryListPageCommands = Pick<
  CategoryListCommands,
  'loadCategories' | 'reorderCategories'
> & {
  createCategory(
    storeId: string,
    isActive: CategoryActiveFilter,
    input: CreateCategoryRequest,
  ): Promise<SaveCategoryResult>;
  updateCategory(
    storeId: string,
    isActive: CategoryActiveFilter,
    categoryId: string,
    input: UpdateCategoryRequest,
  ): Promise<SaveCategoryResult>;
};

export function createCategoryListPageCommands(
  actions: CategoryListActions,
): CategoryListPageCommands {
  const listCommands = createCategoryListCommands(actions);
  const mutationCommands = createCategoryMutationCommands();

  return {
    async createCategory(storeId, isActive, input) {
      const result = await mutationCommands.createCategory(storeId, input);

      if (result.status === 'saved') {
        await listCommands.loadCategories(storeId, isActive);
      }

      return result;
    },

    loadCategories: listCommands.loadCategories,
    reorderCategories: listCommands.reorderCategories,

    async updateCategory(storeId, isActive, categoryId, input) {
      const result = await mutationCommands.updateCategory(
        storeId,
        categoryId,
        input,
      );

      if (result.status === 'saved') {
        await listCommands.loadCategories(storeId, isActive);
      }

      return result;
    },
  };
}
