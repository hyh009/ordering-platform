import type { ApiSuccessResponse } from './api.js';
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
 * Event payload pushed on the guest order SSE stream. The full order DTO is
 * pushed on every change; clients replace their local copy.
 */
export type OrderStreamEventDto = {
  type: 'order_updated';
  order: OrderDto;
};
