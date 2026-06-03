import { z } from 'zod';

import type { ApiSuccessResponse } from './api.js';
import type { AvailabilityRuleDto } from './menuShared.js';
import type { LocalizedStringDto } from './metadata.js';
import { availabilityRuleSchema } from './menuShared.js';

export const productModifierSelectionTypes = [
  'single_choice',
  'multiple_choice',
] as const;

export type ProductModifierSelectionType =
  (typeof productModifierSelectionTypes)[number];

export type ProductModifierOptionDto = {
  id: string;
  sharedOptionCode?: string;
  name: LocalizedStringDto;
  priceAdjustment: number;
  isDefault: boolean;
  isActive: boolean;
  isSoldOut: boolean;
};

export type ProductModifierDto = {
  id: string;
  storeId: string;
  name: LocalizedStringDto;
  selectionType: ProductModifierSelectionType;
  minSelect: number;
  maxSelect: number;
  options: ProductModifierOptionDto[];
  inheritCategoryAvailability: boolean;
  availabilityRules: AvailabilityRuleDto[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export const productModifierNameSchema = z
  .object({
    en: z.string().trim().min(1).max(120).optional(),
    'zh-TW': z.string().trim().min(1).max(120).optional(),
  })
  .refine((value) => !!(value.en?.trim() ?? value['zh-TW']?.trim()), {
    message: 'Name is required in at least one language',
  });

export const productModifierOptionSchema = z.object({
  // Identifies an existing option to preserve on update. Omit for new options;
  // ignored on create (every created option is assigned a fresh id).
  id: z.string().trim().min(1).max(120).optional(),
  sharedOptionCode: z.string().trim().min(1).max(120).optional(),
  name: productModifierNameSchema,
  priceAdjustment: z.number(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isSoldOut: z.boolean().optional(),
});

function validateSelectionBounds(value: {
  selectionType?: ProductModifierSelectionType | undefined;
  minSelect?: number | undefined;
  maxSelect?: number | undefined;
}) {
  if (
    value.minSelect !== undefined &&
    value.maxSelect !== undefined &&
    value.maxSelect < value.minSelect
  ) {
    return false;
  }

  if (
    value.selectionType === 'single_choice' &&
    value.maxSelect !== undefined &&
    value.maxSelect !== 1
  ) {
    return false;
  }

  return true;
}

export const createProductModifierSchema = z
  .object({
    name: productModifierNameSchema,
    selectionType: z.enum(productModifierSelectionTypes),
    minSelect: z.number().int().min(0),
    maxSelect: z.number().int().min(1),
    options: z.array(productModifierOptionSchema).min(1),
    inheritCategoryAvailability: z.boolean().optional(),
    availabilityRules: z.array(availabilityRuleSchema).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(validateSelectionBounds, {
    message: 'Selection bounds are invalid',
  });

export const updateProductModifierSchema = z
  .object({
    name: productModifierNameSchema.optional(),
    selectionType: z.enum(productModifierSelectionTypes).optional(),
    minSelect: z.number().int().min(0).optional(),
    maxSelect: z.number().int().min(1).optional(),
    options: z.array(productModifierOptionSchema).min(1).optional(),
    inheritCategoryAvailability: z.boolean().optional(),
    availabilityRules: z.array(availabilityRuleSchema).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })
  .refine(validateSelectionBounds, {
    message: 'Selection bounds are invalid',
  });

export const productModifierStoreParamsSchema = z.object({
  storeId: z.string().trim().min(1),
});

export const productModifierParamsSchema = z.object({
  storeId: z.string().trim().min(1),
  productModifierId: z.string().trim().min(1),
});

export const listProductModifiersQuerySchema = z
  .object({
    isActive: z.enum(['true', 'false', 'all']).optional().default('all'),
  })
  .optional()
  .default({ isActive: 'all' });

export type ProductModifierActiveFilter = z.infer<
  typeof listProductModifiersQuerySchema
>['isActive'];
export type CreateProductModifierRequest = z.infer<
  typeof createProductModifierSchema
>;
export type UpdateProductModifierRequest = z.infer<
  typeof updateProductModifierSchema
>;
export type ProductModifierStoreParams = z.infer<
  typeof productModifierStoreParamsSchema
>;
export type ProductModifierParams = z.infer<typeof productModifierParamsSchema>;

export type ListProductModifiersSuccessResponse = ApiSuccessResponse<{
  productModifiers: ProductModifierDto[];
}>;
export type CreateProductModifierSuccessResponse = ApiSuccessResponse<{
  productModifier: ProductModifierDto;
}>;
export type UpdateProductModifierSuccessResponse = ApiSuccessResponse<{
  productModifier: ProductModifierDto;
}>;
