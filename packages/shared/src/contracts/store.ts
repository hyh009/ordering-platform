import { z } from 'zod';

import type { ApiSuccessResponse, OffsetPaginationDto } from './api.js';
import { supportedLocales } from './metadata.js';
import type { LocalizedStringDto, SupportedLocale } from './metadata.js';

export const storeStatuses = ['active', 'disabled'] as const;
export const storeCheckoutModes = ['pay_first', 'pay_later'] as const;
export const storeOrderTypes = ['dine_in', 'takeaway'] as const;

export type StoreStatus = (typeof storeStatuses)[number];
export type StoreCheckoutMode = (typeof storeCheckoutModes)[number];
export type StoreOrderType = (typeof storeOrderTypes)[number];

export type BusinessHourDto = {
  dayOfWeek: number;
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
};

export type StoreOrderModeDto = {
  type: StoreOrderType;
  isEnabled: boolean;
  checkoutMode: StoreCheckoutMode;
};

export type StoreProfileDto = {
  displayName: LocalizedStringDto;
  description?: LocalizedStringDto;
};

export type StoreLocaleDto = {
  defaultLocale: SupportedLocale;
  supportedLocales: SupportedLocale[];
};

export type StoreOperationDto = {
  businessHours: BusinessHourDto[];
  serviceFeeRate: number;
  orderModes: StoreOrderModeDto[];
};

export type StoreDto = {
  id: string;
  organizationId: string;
  profile: StoreProfileDto;
  locale: StoreLocaleDto;
  operation: StoreOperationDto;
  status: StoreStatus;
  createdAt: string;
  updatedAt: string;
};

export type GetStoreSuccessResponse = ApiSuccessResponse<{ store: StoreDto }>;

export type ListStoresSuccessResponse = ApiSuccessResponse<{
  stores: StoreDto[];
  pagination: OffsetPaginationDto;
}>;

export type CreateStoreSuccessResponse = ApiSuccessResponse<{ store: StoreDto }>;

export type UpdateStoreSuccessResponse = ApiSuccessResponse<{ store: StoreDto }>;

// ── Request schemas ────────────────────────────────────────────────────────────

function paginationNumberSchema(schema: z.ZodNumber) {
  return z.preprocess(
    (value) => (value === undefined ? undefined : Number(value)),
    schema,
  );
}

const storeDisplayNameSchema = z.object({
  en: z.string().trim().min(1).max(200).optional(),
  'zh-TW': z.string().trim().min(1).max(200),
});

const storeLocalizedTextSchema = z.object({
  en: z.string().trim().min(1).max(500).optional(),
  'zh-TW': z.string().trim().min(1).max(500).optional(),
});

const businessHourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isOpen: z.boolean(),
  openTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid time format, expected HH:MM')
    .optional(),
  closeTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid time format, expected HH:MM')
    .optional(),
});

const storeOrderModeSchema = z.object({
  type: z.enum(storeOrderTypes),
  isEnabled: z.boolean(),
  checkoutMode: z.enum(storeCheckoutModes),
});

export const createStoreSchema = z.object({
  profile: z.object({
    displayName: storeDisplayNameSchema,
    description: storeLocalizedTextSchema.optional(),
  }),
  locale: z.object({
    defaultLocale: z.enum(supportedLocales),
    supportedLocales: z.array(z.enum(supportedLocales)).min(1),
  }),
  operation: z.object({
    businessHours: z.array(businessHourSchema),
    serviceFeeRate: z.number().min(0).max(1),
    orderModes: z.array(storeOrderModeSchema),
  }),
});

export const updateStoreSchema = z
  .object({
    profile: z
      .object({
        displayName: storeDisplayNameSchema.optional(),
        description: storeLocalizedTextSchema.optional(),
      })
      .optional(),
    locale: z
      .object({
        defaultLocale: z.enum(supportedLocales).optional(),
        supportedLocales: z.array(z.enum(supportedLocales)).min(1).optional(),
      })
      .optional(),
    operation: z
      .object({
        businessHours: z.array(businessHourSchema).optional(),
        serviceFeeRate: z.number().min(0).max(1).optional(),
        orderModes: z.array(storeOrderModeSchema).optional(),
      })
      .optional(),
    status: z.enum(storeStatuses).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const storeParamsSchema = z.object({
  storeId: z.string().trim().min(1),
});

export const storeWithOrgParamsSchema = z.object({
  organizationId: z.string().trim().min(1),
  storeId: z.string().trim().min(1),
});

export const listStoresQuerySchema = z
  .object({
    offset: paginationNumberSchema(z.number().int().min(0)).optional().default(0),
    limit: paginationNumberSchema(z.number().int().min(1).max(100))
      .optional()
      .default(20),
  })
  .optional()
  .default({ offset: 0, limit: 20 });

export type CreateStoreRequest = z.infer<typeof createStoreSchema>;
export type UpdateStoreRequest = z.infer<typeof updateStoreSchema>;
export type StoreParams = z.infer<typeof storeParamsSchema>;
export type StoreWithOrgParams = z.infer<typeof storeWithOrgParamsSchema>;
export type ListStoresQuery = z.infer<typeof listStoresQuerySchema>;
