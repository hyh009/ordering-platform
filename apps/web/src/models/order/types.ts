import type {
  AdvanceBatchStatusRequest,
  CancelBatchRequest,
  CancelOrderRequest,
  CheckoutOrderRequest,
  CompleteOrderRequest,
  GetGuestOrderSuccessResponse,
  GetMerchantOrderSuccessResponse,
  GuestStreamEventDto,
  ListOrdersQuery,
  ListOrdersSuccessResponse,
  OrderBatchDto,
  OrderBatchStatus,
  OrderCancelReason,
  OrderDto,
  OrderPaymentStatus,
  OrderStatus,
  OrderSummaryDto,
} from '@repo/shared';

export type {
  AdvanceBatchStatusRequest,
  CancelBatchRequest,
  CancelOrderRequest,
  CheckoutOrderRequest,
  CompleteOrderRequest,
  GetGuestOrderSuccessResponse,
  GetMerchantOrderSuccessResponse,
  GuestStreamEventDto,
  ListOrdersQuery,
  ListOrdersSuccessResponse,
  OrderBatchStatus,
  OrderCancelReason,
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
