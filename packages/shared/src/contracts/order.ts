import { z } from 'zod';

import type { ApiSuccessResponse } from './api.js';
import type { CartDto, CartItemDto, OrderingParticipantDto } from './cart.js';
import type { StoreCheckoutMode, StoreOrderType } from './store.js';

export const orderStatuses = [
  'pending_payment',
  'pending_confirmation',
  'preparing',
  'ready',
  'served',
  'completed',
  'cancelled',
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export const orderPaymentStatuses = [
  'unpaid',
  'paid',
  'refunded',
  'voided',
] as const;

export type OrderPaymentStatus = (typeof orderPaymentStatuses)[number];

export const orderBatchStatuses = [
  'pending_confirmation',
  'preparing',
  'ready',
  'cancelled',
] as const;

export type OrderBatchStatus = (typeof orderBatchStatuses)[number];

export type OrderBatchDto = {
  id: string;
  batchNumber: number;
  status: OrderBatchStatus;
  submittedAt: string;
  submittedByParticipantId?: string;
  confirmedAt?: string;
  readyAt?: string;
  cancelledAt?: string;
  items: CartItemDto[];
  subtotal: number;
};

export type OrderParticipantAmountDto = {
  participantId: string;
  itemSubtotal: number;
  serviceFeeAmount: number;
  totalAmount: number;
};

export type OrderDto = {
  id: string;
  storeId: string;
  orderType: StoreOrderType;
  checkoutMode: StoreCheckoutMode;
  businessDate: string;
  displayNumber: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  /**
   * Whether a guest may still add another batch to this order, computed
   * server-side (dine-in pay-later, unpaid, not finished, before the deadline).
   * The single source of truth — clients read this instead of recomputing.
   */
  canAddOn: boolean;
  tableNumber?: string;
  participants: OrderingParticipantDto[];
  items: CartItemDto[];
  batches: OrderBatchDto[];
  /**
   * Server-computed per-participant amount breakdown (reference amounts only;
   * this platform does not process payments). The order service fee is split
   * across participants by item subtotal using largest-remainder rounding, so
   * the per-participant amounts reconcile exactly to the order totals.
   */
  participantAmounts: OrderParticipantAmountDto[];
  notes?: string;
  subtotal: number;
  serviceFeeRate: number;
  serviceFeeAmount: number;
  totalAmount: number;
  orderingClosesAt: string;
  paidAt?: string;
  servedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
};

// ── Responses ──────────────────────────────────────────────────────────────────

export type GetGuestOrderSuccessResponse = ApiSuccessResponse<{
  order: OrderDto;
}>;

// ── SSE stream events ──────────────────────────────────────────────────────────

/**
 * Event payload pushed on the guest session SSE stream. One connection spans a
 * guest session's whole lifecycle: `cart_updated` while a draft cart is live,
 * `order_updated` once a round has been submitted. Both carry the full DTO, so
 * clients replace their local copy and a reconnect resyncs from the snapshot.
 */
export type GuestStreamEventDto =
  | { type: 'cart_updated'; cart: CartDto }
  | { type: 'order_updated'; order: OrderDto };

// ── Merchant read contracts ────────────────────────────────────────────────────

/**
 * Lightweight summary returned in list responses. Does not include items,
 * batches, or per-participant amounts; those come from the full OrderDto on
 * the detail endpoint.
 */
export type OrderSummaryDto = {
  id: string;
  displayNumber: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  orderType: StoreOrderType;
  checkoutMode: StoreCheckoutMode;
  businessDate: string; // YYYY-MM-DD
  tableNumber?: string;
  participantCount: number;
  itemCount: number; // sum of item quantities
  totalAmount: number;
  createdAt: string; // ISO
};

export const orderStoreParamsSchema = z.object({
  storeId: z.string().trim().min(1),
});

export const orderParamsSchema = z.object({
  storeId: z.string().trim().min(1),
  orderId: z.string().trim().min(1),
});

const PAGE_SIZE_MAX = 100;

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGE_SIZE_MAX)
    .optional()
    .default(20),
  status: z.enum(orderStatuses).optional(),
  paymentStatus: z.enum(orderPaymentStatuses).optional(),
  businessDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  q: z.string().trim().max(200).optional(),
});

export type OrderStoreParams = z.infer<typeof orderStoreParamsSchema>;
export type OrderParams = z.infer<typeof orderParamsSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;

export type ListOrdersSuccessResponse = ApiSuccessResponse<{
  orders: OrderSummaryDto[];
  total: number;
  page: number;
  pageSize: number;
}>;

/** Alias for the merchant detail endpoint; returns the same shape as the guest order. */
export type GetMerchantOrderSuccessResponse = ApiSuccessResponse<{
  order: OrderDto;
}>;
