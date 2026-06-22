import { z } from 'zod';

import type { ApiSuccessResponse } from './api.js';
import { cartItemInputSchema } from './cart.js';
import type { CartItemDto, OrderingParticipantDto } from './cart.js';
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

export type OrderDto = {
  id: string;
  storeId: string;
  orderType: StoreOrderType;
  checkoutMode: StoreCheckoutMode;
  businessDate: string;
  displayNumber: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  tableNumber?: string;
  participants: OrderingParticipantDto[];
  items: CartItemDto[];
  batches: OrderBatchDto[];
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

// ── Request schemas ────────────────────────────────────────────────────────────

// TODO(phase4): Remove `addOrderBatchSchema`/`AddOrderBatchRequest`/
// `AddOrderBatchSuccessResponse`. Phase 2 removed the backend `addOrderBatch`
// service + `POST /v1/public/guest/order/batches` route (add-on is now unified
// into `submitCart`). These contracts are kept only because the frontend still
// imports them (`apps/web/src/models/order/types.ts`,
// `apps/web/src/services/storeFrontOrder.service.ts` unused `addBatch`); remove
// them together with that dead frontend code in the Phase 4 frontend pass.
export const addOrderBatchSchema = z.object({
  items: z.array(cartItemInputSchema).min(1).max(50),
});

export type AddOrderBatchRequest = z.infer<typeof addOrderBatchSchema>;

// ── Responses ──────────────────────────────────────────────────────────────────

export type GetGuestOrderSuccessResponse = ApiSuccessResponse<{
  order: OrderDto;
}>;

export type AddOrderBatchSuccessResponse = ApiSuccessResponse<{
  order: OrderDto;
}>;

// ── SSE stream events ──────────────────────────────────────────────────────────

/**
 * Event payload pushed on the guest order SSE stream. The full order DTO is
 * pushed on every change; clients replace their local copy.
 */
export type OrderStreamEventDto = {
  type: 'order_updated';
  order: OrderDto;
};
