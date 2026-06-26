import type {
  GetGuestOrderSuccessResponse,
  GuestStreamEventDto,
  OrderBatchDto,
  OrderBatchStatus,
  OrderDto,
  OrderPaymentStatus,
  OrderStatus,
} from '@repo/shared';

export type {
  GetGuestOrderSuccessResponse,
  GuestStreamEventDto,
  OrderBatchStatus,
  OrderPaymentStatus,
  OrderStatus,
};

export type Order = OrderDto;
export type OrderBatch = OrderBatchDto;
