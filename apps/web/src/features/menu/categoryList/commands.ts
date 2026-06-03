import { tDefault } from '@/app/i18n';
import { createCategorySchema, updateCategorySchema } from '@/models/category';
import type {
  Category,
  CategoryActiveFilter,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@/models/category';
import { categoryService } from '@/services/category.service';
import {
  mapMerchantApiError,
  type MerchantCommandFailure,
} from '@/services/utils/merchantApiError';
import type { CategoryListActions } from './actions';

export type CategoryCommandFieldErrors = Partial<
  Record<'name' | 'description', string>
>;

export type LoadCategoriesResult =
  | {
      status: 'loaded';
    }
  | MerchantCommandFailure;

export type ReorderCategoriesResult =
  | { status: 'reordered' }
  | MerchantCommandFailure;

export type SaveCategoryResult =
  | {
      category: Category;
      status: 'saved';
    }
  | (MerchantCommandFailure & {
      fieldErrors?: CategoryCommandFieldErrors;
    });

function mapCategoryFieldErrors(
  issues: Array<{ path: PropertyKey[] }>,
): CategoryCommandFieldErrors {
  return Object.fromEntries(
    issues.map((issue) => {
      const field = String(issue.path[0] ?? '');
      let key: keyof CategoryCommandFieldErrors = 'name';

      if (field.startsWith('description')) {
        key = 'description';
      }

      return [
        key,
        tDefault(
          'merchant.categories.validation.invalid',
          'This field is invalid.',
        ),
      ];
    }),
  ) as CategoryCommandFieldErrors;
}

export type CategoryListCommands = {
  createCategory(
    storeId: string,
    input: CreateCategoryRequest,
  ): Promise<SaveCategoryResult>;
  loadCategories(
    storeId: string,
    isActive: CategoryActiveFilter,
  ): Promise<LoadCategoriesResult>;
  reorderCategories(
    storeId: string,
    orderedIds: string[],
  ): Promise<ReorderCategoriesResult>;
  updateCategory(
    storeId: string,
    categoryId: string,
    input: UpdateCategoryRequest,
  ): Promise<SaveCategoryResult>;
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

    async createCategory(storeId, input) {
      const validation = createCategorySchema.safeParse(input);

      if (!validation.success) {
        return {
          fieldErrors: mapCategoryFieldErrors(validation.error.issues),
          message: tDefault(
            'merchant.errors.validation',
            'Check the highlighted fields and try again.',
          ),
          reason: 'invalid',
          status: 'failed',
        };
      }

      try {
        const category = await categoryService.createCategory(storeId, input);

        actions.categorySaved(category);
        return {
          category,
          status: 'saved',
        };
      } catch (error) {
        return mapMerchantApiError(error);
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

    async updateCategory(storeId, categoryId, input) {
      const validation = updateCategorySchema.safeParse(input);

      if (!validation.success) {
        return {
          fieldErrors: mapCategoryFieldErrors(validation.error.issues),
          message: tDefault(
            'merchant.errors.validation',
            'Check the highlighted fields and try again.',
          ),
          reason: 'invalid',
          status: 'failed',
        };
      }

      try {
        const category = await categoryService.updateCategory(
          storeId,
          categoryId,
          input,
        );

        actions.categorySaved(category);
        return {
          category,
          status: 'saved',
        };
      } catch (error) {
        return mapMerchantApiError(error);
      }
    },
  };
}
