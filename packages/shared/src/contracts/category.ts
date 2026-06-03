import { z } from 'zod';

import type { ApiSuccessResponse } from './api.js';
import type { AvailabilityRuleDto } from './menuShared.js';
import type { LocalizedStringDto } from './metadata.js';
import { availabilityRuleSchema } from './menuShared.js';

export type CategoryDto = {
  id: string;
  storeId: string;
  name: LocalizedStringDto;
  description?: LocalizedStringDto;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
  availabilityRules: AvailabilityRuleDto[];
  createdAt: string;
  updatedAt: string;
};

export const categoryNameSchema = z
  .object({
    en: z.string().trim().min(1).max(120).optional(),
    'zh-TW': z.string().trim().min(1).max(120).optional(),
  })
  .refine((value) => !!(value.en?.trim() ?? value['zh-TW']?.trim()), {
    message: 'Name is required in at least one language',
  });

export const categoryDescriptionSchema = z.object({
  en: z.string().trim().min(1).max(500).optional(),
  'zh-TW': z.string().trim().min(1).max(500).optional(),
});

const categoryImageUrlSchema = z.string().trim().url().max(2048);

export const createCategorySchema = z.object({
  name: categoryNameSchema,
  description: categoryDescriptionSchema.optional(),
  imageUrl: categoryImageUrlSchema.optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  availabilityRules: z.array(availabilityRuleSchema).optional(),
});

export const updateCategorySchema = z
  .object({
    name: categoryNameSchema.optional(),
    description: categoryDescriptionSchema.optional(),
    imageUrl: categoryImageUrlSchema.nullable().optional(),
    displayOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    availabilityRules: z.array(availabilityRuleSchema).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const categoryStoreParamsSchema = z.object({
  storeId: z.string().trim().min(1),
});

export const categoryParamsSchema = z.object({
  storeId: z.string().trim().min(1),
  categoryId: z.string().trim().min(1),
});

export const listCategoriesQuerySchema = z
  .object({
    isActive: z.enum(['true', 'false', 'all']).optional().default('all'),
  })
  .optional()
  .default({ isActive: 'all' });

export type CategoryActiveFilter = z.infer<
  typeof listCategoriesQuerySchema
>['isActive'];
export type CreateCategoryRequest = z.infer<typeof createCategorySchema>;
export type UpdateCategoryRequest = z.infer<typeof updateCategorySchema>;
export type CategoryStoreParams = z.infer<typeof categoryStoreParamsSchema>;
export type CategoryParams = z.infer<typeof categoryParamsSchema>;

export const reorderCategoriesSchema = z.object({
  orderedIds: z.array(z.string().trim().min(1)).min(1).max(500),
});

export type ReorderCategoriesRequest = z.infer<typeof reorderCategoriesSchema>;

export type ListCategoriesSuccessResponse = ApiSuccessResponse<{
  categories: CategoryDto[];
}>;
export type CreateCategorySuccessResponse = ApiSuccessResponse<{
  category: CategoryDto;
}>;
export type UpdateCategorySuccessResponse = ApiSuccessResponse<{
  category: CategoryDto;
}>;
export type ReorderCategoriesSuccessResponse = ApiSuccessResponse<
  Record<string, never>
>;
