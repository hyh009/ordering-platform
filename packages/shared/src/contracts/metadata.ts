import { z } from 'zod';

import type { ApiSuccessResponse } from './api.js';

export const supportedLocales = ['en', 'zh-TW'] as const;

export const dietaryMarkerTypes = ['dietary', 'regulatory'] as const;

export type SupportedLocale = (typeof supportedLocales)[number];
export type LocalizedStringDto = Partial<
  Record<SupportedLocale, string | undefined>
>;
export type DietaryMarkerType = (typeof dietaryMarkerTypes)[number];

export type AllergenDto = {
  id: string;
  key: string;
  name: LocalizedStringDto;
  icon?: string;
  isActive: boolean;
};

export type DietaryMarkerDto = {
  id: string;
  key: string;
  name: LocalizedStringDto;
  icon?: string;
  type: DietaryMarkerType;
  isActive: boolean;
};

export const metadataKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, {
    message: 'Key must use lowercase letters, numbers, hyphens, or underscores',
  });

export const localizedMetadataNameSchema = z.object({
  en: z.string().trim().min(1).max(120).optional(),
  'zh-TW': z.string().trim().min(1).max(120),
});

export const metadataActiveFilterSchema = z
  .object({
    isActive: z.enum(['true', 'false', 'all']).optional().default('true'),
  })
  .optional()
  .default({ isActive: 'true' });

export const allergenParamsSchema = z.object({
  allergenId: z.string().trim().min(1),
});

export const dietaryMarkerParamsSchema = z.object({
  dietaryMarkerId: z.string().trim().min(1),
});

export const createAllergenSchema = z.object({
  key: metadataKeySchema,
  name: localizedMetadataNameSchema,
  icon: z.string().trim().min(1).max(80).optional(),
  isActive: z.boolean().optional(),
});

export const updateAllergenSchema = z
  .object({
    name: localizedMetadataNameSchema.optional(),
    icon: z.string().trim().min(1).max(80).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const createDietaryMarkerSchema = z.object({
  key: metadataKeySchema,
  name: localizedMetadataNameSchema,
  icon: z.string().trim().min(1).max(80).optional(),
  type: z.enum(dietaryMarkerTypes).default('dietary'),
  isActive: z.boolean().optional(),
});

export const updateDietaryMarkerSchema = z
  .object({
    name: localizedMetadataNameSchema.optional(),
    icon: z.string().trim().min(1).max(80).nullable().optional(),
    type: z.enum(dietaryMarkerTypes).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export type MetadataActiveFilter = z.infer<
  typeof metadataActiveFilterSchema
>['isActive'];

export type AllergenParams = z.infer<typeof allergenParamsSchema>;
export type DietaryMarkerParams = z.infer<typeof dietaryMarkerParamsSchema>;
export type CreateAllergenRequest = z.infer<typeof createAllergenSchema>;
export type UpdateAllergenRequest = z.infer<typeof updateAllergenSchema>;
export type CreateDietaryMarkerRequest = z.infer<
  typeof createDietaryMarkerSchema
>;
export type UpdateDietaryMarkerRequest = z.infer<
  typeof updateDietaryMarkerSchema
>;

export type ListAllergensSuccessResponse = ApiSuccessResponse<{
  allergens: AllergenDto[];
}>;

export type CreateAllergenSuccessResponse = ApiSuccessResponse<{
  allergen: AllergenDto;
}>;

export type UpdateAllergenSuccessResponse = ApiSuccessResponse<{
  allergen: AllergenDto;
}>;

export type ListDietaryMarkersSuccessResponse = ApiSuccessResponse<{
  dietaryMarkers: DietaryMarkerDto[];
}>;

export type CreateDietaryMarkerSuccessResponse = ApiSuccessResponse<{
  dietaryMarker: DietaryMarkerDto;
}>;

export type UpdateDietaryMarkerSuccessResponse = ApiSuccessResponse<{
  dietaryMarker: DietaryMarkerDto;
}>;
