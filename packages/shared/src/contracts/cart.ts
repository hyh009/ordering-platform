import { z } from 'zod';

import type { ApiSuccessResponse } from './api.js';
import type { LocalizedStringDto } from './metadata.js';
import type { OrderDto } from './order.js';
import { storeOrderTypes } from './store.js';
import type { StoreCheckoutMode, StoreOrderType } from './store.js';

export const cartStatuses = ['active', 'checked_out', 'abandoned'] as const;
export const anonymousAvatarKeys = [
  'bear',
  'cat',
  'dog',
  'eagle',
  'elephant',
  'flamingo',
  'gorilla',
  'lion',
  'monkey',
  'octopus',
  'owl',
  'ox',
  'sheep',
  'unicorn',
  'wolf',
  'zebra',
] as const;

export type CartStatus = (typeof cartStatuses)[number];
export type AnonymousAvatarKey = (typeof anonymousAvatarKeys)[number];
export const anonymousAvatarKeySchema = z.enum(anonymousAvatarKeys);

export type OrderingParticipantDto = {
  id: string;
  avatarKey: AnonymousAvatarKey;
  displayName?: string;
  joinedAt: string;
};

export type SelectedModifierOptionDto = {
  modifierId: string;
  modifierName: LocalizedStringDto;
  optionId: string;
  optionName: LocalizedStringDto;
  priceAdjustment: number;
};

export type CartItemDto = {
  id: string;
  productId: string;
  productName: LocalizedStringDto;
  quantity: number;
  unitPrice: number;
  selectedOptions: SelectedModifierOptionDto[];
  addedByParticipantId?: string;
  participantDisplayName?: string;
  notes?: string;
  totalItemPrice: number;
  createdAt: string;
};

export type CartDto = {
  id: string;
  storeId: string;
  orderType: StoreOrderType;
  checkoutMode: StoreCheckoutMode;
  status: CartStatus;
  joinCode?: string;
  tableNumber?: string;
  participants: OrderingParticipantDto[];
  items: CartItemDto[];
  notes?: string;
  subtotal: number;
  serviceFeeRate: number;
  serviceFeeAmount: number;
  totalAmount: number;
  orderId?: string;
  expiresAt: string;
  orderingClosesAt?: string;
  createdAt: string;
  updatedAt: string;
};

// ── Request schemas ────────────────────────────────────────────────────────────

const guestDisplayNameSchema = z.string().trim().min(1).max(50);
const cartTableNumberSchema = z.string().trim().min(1).max(20);
const cartItemNotesSchema = z.string().trim().min(1).max(500);

export const createCartSchema = z.object({
  orderType: z.enum(storeOrderTypes),
  tableNumber: cartTableNumberSchema.optional(),
  avatarKey: anonymousAvatarKeySchema,
  displayName: guestDisplayNameSchema.optional(),
});

export const joinCartSchema = z.object({
  joinCode: z.string().trim().min(1).max(64),
  avatarKey: anonymousAvatarKeySchema,
  displayName: guestDisplayNameSchema.optional(),
});

const selectedOptionInputSchema = z.object({
  modifierId: z.string().trim().min(1).max(120),
  optionId: z.string().trim().min(1).max(120),
});

const selectedOptionsInputSchema = z
  .array(selectedOptionInputSchema)
  .max(50)
  .refine(
    (options) =>
      new Set(
        options.map((option) => `${option.modifierId}:${option.optionId}`),
      ).size === options.length,
    { message: 'Selected options must be unique' },
  );

export const cartItemInputSchema = z.object({
  productId: z.string().trim().min(1).max(120),
  quantity: z.number().int().min(1).max(99),
  selectedOptions: selectedOptionsInputSchema.optional(),
  notes: cartItemNotesSchema.optional(),
});

export const updateCartItemSchema = z
  .object({
    quantity: z.number().int().min(1).max(99).optional(),
    selectedOptions: selectedOptionsInputSchema.optional(),
    notes: cartItemNotesSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const submitCartSchema = z.object({
  notes: z.string().trim().min(1).max(500).optional(),
});

export const cartItemParamsSchema = z.object({
  itemId: z.string().trim().min(1),
});

export type CreateCartRequest = z.infer<typeof createCartSchema>;
export type JoinCartRequest = z.infer<typeof joinCartSchema>;
export type CartItemInput = z.infer<typeof cartItemInputSchema>;
export type AddCartItemRequest = CartItemInput;
export type UpdateCartItemRequest = z.infer<typeof updateCartItemSchema>;
export type SubmitCartRequest = z.infer<typeof submitCartSchema>;
export type CartItemParams = z.infer<typeof cartItemParamsSchema>;

// ── Responses ──────────────────────────────────────────────────────────────────

/**
 * Current guest ordering context resolved from a guest token.
 * `cart` is present while the cart is active; `order` is present once the
 * cart has been checked out into an order.
 */
export type GuestSessionDto = {
  participantId: string;
  joinCode?: string;
  cart?: CartDto;
  order?: OrderDto;
};

export type CreateCartSuccessResponse = ApiSuccessResponse<{
  cart: CartDto;
  participantId: string;
  guestToken: string;
}>;

export type JoinCartSuccessResponse = ApiSuccessResponse<{
  session: GuestSessionDto;
  guestToken: string;
}>;

export type GetGuestSessionSuccessResponse = ApiSuccessResponse<{
  session: GuestSessionDto;
}>;

export type GetGuestCartSuccessResponse = ApiSuccessResponse<{ cart: CartDto }>;

export type MutateGuestCartSuccessResponse = ApiSuccessResponse<{
  cart: CartDto;
}>;

export type LeaveCartSuccessResponse = ApiSuccessResponse<{
  leftCartId: string;
}>;

export type SubmitCartSuccessResponse = ApiSuccessResponse<{ order: OrderDto }>;
