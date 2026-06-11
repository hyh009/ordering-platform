import type {
  AddOrderBatchRequest,
  AddOrderBatchSuccessResponse,
  GetGuestOrderSuccessResponse,
  OrderBatchDto,
  OrderBatchStatus,
  OrderDto,
  OrderPaymentStatus,
  OrderStatus,
  OrderStreamEventDto,
} from '@repo/shared';

export type {
  AddOrderBatchRequest,
  AddOrderBatchSuccessResponse,
  GetGuestOrderSuccessResponse,
  OrderBatchStatus,
  OrderPaymentStatus,
  OrderStatus,
  OrderStreamEventDto,
};

export type Order = OrderDto;
export type OrderBatch = OrderBatchDto;
