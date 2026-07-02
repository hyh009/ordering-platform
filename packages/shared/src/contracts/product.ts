import { z } from 'zod';

import type { ApiSuccessResponse } from './api.js';
import type { LocalizedStringDto } from './metadata.js';

export type ProductStatus = 'draft' | 'published';

export type ProductDto = {
  id: string;
  storeId: string;
  categoryIds: string[];
  name: LocalizedStringDto;
  description?: LocalizedStringDto;
  imageUrls: string[];
  price: number;
  tagIds: string[];
  allergenIds: string[];
  dietaryMarkerIds: string[];
  modifierIds: string[];
  status: ProductStatus;
  isActive: boolean;
  isSoldOut: boolean;
  createdAt: string;
  updatedAt: string;
};

export const productNameSchema = z
  .object({
    en: z.string().trim().min(1).max(120).optional(),
    'zh-TW': z.string().trim().min(1).max(120).optional(),
  })
  .refine((value) => !!(value.en?.trim() ?? value['zh-TW']?.trim()), {
    message: 'Name is required in at least one language',
  });

export const productDescriptionSchema = z.object({
  en: z.string().trim().min(1).max(1000).optional(),
  'zh-TW': z.string().trim().min(1).max(1000).optional(),
});

const productImageUrlSchema = z.string().trim().url().max(2048);
const productImageUrlsSchema = z.array(productImageUrlSchema).max(10);
export const productStatusSchema = z.enum(['draft', 'published']);
const productReferenceIdsSchema = z
  .array(z.string().trim().min(1).max(120))
  .max(500)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: 'Reference ids must be unique',
  });

export const createProductSchema = z.object({
  categoryIds: productReferenceIdsSchema.optional(),
  name: productNameSchema,
  description: productDescriptionSchema.optional(),
  imageUrls: productImageUrlsSchema.optional(),
  price: z.number().min(0),
  tagIds: productReferenceIdsSchema.optional(),
  allergenIds: productReferenceIdsSchema.optional(),
  dietaryMarkerIds: productReferenceIdsSchema.optional(),
  modifierIds: productReferenceIdsSchema.optional(),
  status: productStatusSchema.optional(),
  isActive: z.boolean().optional(),
});

export const updateProductSchema = z
  .object({
    categoryIds: productReferenceIdsSchema.optional(),
    name: productNameSchema.optional(),
    description: productDescriptionSchema.optional(),
    imageUrls: productImageUrlsSchema.optional(),
    price: z.number().min(0).optional(),
    tagIds: productReferenceIdsSchema.optional(),
    allergenIds: productReferenceIdsSchema.optional(),
    dietaryMarkerIds: productReferenceIdsSchema.optional(),
    modifierIds: productReferenceIdsSchema.optional(),
    status: productStatusSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const toggleProductSoldOutSchema = z.object({
  isSoldOut: z.boolean(),
});

export const productStoreParamsSchema = z.object({
  storeId: z.string().trim().min(1),
});

export const productParamsSchema = z.object({
  storeId: z.string().trim().min(1),
  productId: z.string().trim().min(1),
});

export const listProductsQuerySchema = z
  .object({
    isActive: z.enum(['true', 'false', 'all']).optional().default('all'),
    // When present, return only this category's products, ordered by the
    // category's saved productOrder.
    categoryId: z.string().trim().min(1).optional(),
  })
  .optional()
  .default({ isActive: 'all' });

export type ProductActiveFilter = z.infer<
  typeof listProductsQuerySchema
>['isActive'];
export type CreateProductRequest = z.infer<typeof createProductSchema>;
export type UpdateProductRequest = z.infer<typeof updateProductSchema>;
export type ToggleProductSoldOutRequest = z.infer<
  typeof toggleProductSoldOutSchema
>;
export type ProductStoreParams = z.infer<typeof productStoreParamsSchema>;
export type ProductParams = z.infer<typeof productParamsSchema>;

export type ListProductsSuccessResponse = ApiSuccessResponse<{
  products: ProductDto[];
}>;
export type GetProductSuccessResponse = ApiSuccessResponse<{
  product: ProductDto;
}>;
export type CreateProductSuccessResponse = ApiSuccessResponse<{
  product: ProductDto;
}>;
export type UpdateProductSuccessResponse = ApiSuccessResponse<{
  product: ProductDto;
}>;
export type ToggleProductSoldOutSuccessResponse = ApiSuccessResponse<{
  product: ProductDto;
}>;
