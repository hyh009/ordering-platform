import type { CategoryListActions } from '@/features/menu/categoryList/actions';
import {
  createCategoryListCommands,
  type CategoryListCommands,
  type LoadCategoriesResult,
  type ReorderCategoriesResult,
  type SaveCategoryResult,
} from '@/features/menu/categoryList/commands';

export type { LoadCategoriesResult, ReorderCategoriesResult, SaveCategoryResult };

export type CategoryListPageCommands = Pick<
  CategoryListCommands,
  'createCategory' | 'loadCategories' | 'reorderCategories' | 'updateCategory'
>;

export function createCategoryListPageCommands(
  actions: CategoryListActions,
): CategoryListPageCommands {
  const base = createCategoryListCommands(actions);

  return {
    createCategory: base.createCategory,
    loadCategories: base.loadCategories,
    reorderCategories: base.reorderCategories,
    updateCategory: base.updateCategory,
  };
}
