import { tDefault } from '@/app/i18n';
import { createCategorySchema, updateCategorySchema } from '@/models/category';
import type {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@/models/category';
import { categoryService } from '@/services/category.service';
import {
  mapMerchantApiError,
  type MerchantCommandFailure,
} from '@/services/utils/merchantApiError';

export type CategoryCommandFieldErrors = Partial<
  Record<'name' | 'description', string>
>;

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

export type CategoryMutationCommands = {
  createCategory(
    storeId: string,
    input: CreateCategoryRequest,
  ): Promise<SaveCategoryResult>;
  updateCategory(
    storeId: string,
    categoryId: string,
    input: UpdateCategoryRequest,
  ): Promise<SaveCategoryResult>;
};

export function createCategoryMutationCommands(): CategoryMutationCommands {
  return {
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

        return {
          category,
          status: 'saved',
        };
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
