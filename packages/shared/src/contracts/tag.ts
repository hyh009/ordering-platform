import { z } from 'zod';

import type { ApiSuccessResponse } from './api.js';
import type { LocalizedStringDto } from './metadata.js';

export type TagDto = {
  id: string;
  storeId: string;
  name: LocalizedStringDto;
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// Default-locale enforcement lives in the service layer because the required
// locale depends on the owning store. The schema only guarantees at least one
// localized value, matching the Mongo name validator.
export const tagNameSchema = z
  .object({
    en: z.string().trim().min(1).max(120).optional(),
    'zh-TW': z.string().trim().min(1).max(120).optional(),
  })
  .refine((value) => !!(value.en?.trim() ?? value['zh-TW']?.trim()), {
    message: 'Name is required in at least one language',
  });

const tagColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, {
    message: 'Color must be a hex value like #1A2B3C',
  });

export const createTagSchema = z.object({
  name: tagNameSchema,
  color: tagColorSchema.optional(),
  isActive: z.boolean().optional(),
});

export const updateTagSchema = z
  .object({
    name: tagNameSchema.optional(),
    color: tagColorSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const tagStoreParamsSchema = z.object({
  storeId: z.string().trim().min(1),
});

export const tagParamsSchema = z.object({
  storeId: z.string().trim().min(1),
  tagId: z.string().trim().min(1),
});

export const listTagsQuerySchema = z
  .object({
    isActive: z.enum(['true', 'false', 'all']).optional().default('all'),
  })
  .optional()
  .default({ isActive: 'all' });

export type TagActiveFilter = z.infer<typeof listTagsQuerySchema>['isActive'];
export type CreateTagRequest = z.infer<typeof createTagSchema>;
export type UpdateTagRequest = z.infer<typeof updateTagSchema>;
export type TagStoreParams = z.infer<typeof tagStoreParamsSchema>;
export type TagParams = z.infer<typeof tagParamsSchema>;

export type ListTagsSuccessResponse = ApiSuccessResponse<{ tags: TagDto[] }>;
export type CreateTagSuccessResponse = ApiSuccessResponse<{ tag: TagDto }>;
export type UpdateTagSuccessResponse = ApiSuccessResponse<{ tag: TagDto }>;
