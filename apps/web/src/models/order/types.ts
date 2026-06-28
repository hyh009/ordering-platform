import type {
  GetGuestOrderSuccessResponse,
  GetMerchantOrderSuccessResponse,
  GuestStreamEventDto,
  ListOrdersQuery,
  ListOrdersSuccessResponse,
  OrderBatchDto,
  OrderBatchStatus,
  OrderDto,
  OrderPaymentStatus,
  OrderStatus,
  OrderSummaryDto,
} from '@repo/shared';

export type {
  GetGuestOrderSuccessResponse,
  GetMerchantOrderSuccessResponse,
  GuestStreamEventDto,
  ListOrdersQuery,
  ListOrdersSuccessResponse,
  OrderBatchStatus,
  OrderPaymentStatus,
  OrderStatus,
  OrderSummaryDto,
};

export type Order = OrderDto;
export type OrderBatch = OrderBatchDto;

/**
 * Lightweight order summary used in the merchant order list.
 * Does not include items, batches, or per-participant amounts.
 */
export type OrderSummary = OrderSummaryDto;
