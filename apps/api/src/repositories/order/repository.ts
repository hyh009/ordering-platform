import { orderMongoRepository } from '@src/repositories/order/mongo.repository';

import type {
  CartItemSnapshot,
  OrderingParticipantSnapshot,
} from '@src/models/cart/model';
import type {
  OrderBatchSnapshot,
  OrderEntity,
  OrderPaymentStatus,
  OrderStatus,
} from '@src/models/order/model';
import type {
  StoreCheckoutMode,
  StoreOrderType,
} from '@src/models/store/model';
import type { ClientSession } from 'mongoose';

export type ListOrdersByStoreInput = {
  storeId: string;
  status?: OrderStatus | undefined;
  paymentStatus?: OrderPaymentStatus | undefined;
  businessDate?: string | undefined;
  q?: string | undefined;
  skip: number;
  limit: number;
};

export type CreateOrderInput = {
  organizationId: string;
  storeId: string;
  cartId?: string | undefined;
  orderType: StoreOrderType;
  checkoutMode: StoreCheckoutMode;
  businessDate: string;
  dailySequence: number;
  displayNumber: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  tableNumber?: string | undefined;
  participants: OrderingParticipantSnapshot[];
  items: CartItemSnapshot[];
  batches: OrderBatchSnapshot[];
  notes?: string | undefined;
  subtotal: number;
  serviceFeeRate: number;
  serviceFeeAmount: number;
  totalAmount: number;
  orderingClosesAt: Date;
};

export type UpdateOrderInput = {
  status?: OrderStatus | undefined;
  paymentStatus?: OrderPaymentStatus | undefined;
  participants?: OrderingParticipantSnapshot[] | undefined;
  items?: CartItemSnapshot[] | undefined;
  batches?: OrderBatchSnapshot[] | undefined;
  notes?: string | undefined;
  subtotal?: number | undefined;
  serviceFeeAmount?: number | undefined;
  totalAmount?: number | undefined;
  paidAt?: Date | undefined;
  servedAt?: Date | undefined;
  completedAt?: Date | undefined;
  cancelledAt?: Date | undefined;
};

export type UpdateOrderOptions = {
  expectedUpdatedAt?: Date | undefined;
  session?: ClientSession | undefined;
};

export type OrderRepository = {
  create(
    input: CreateOrderInput,
    session?: ClientSession,
  ): Promise<OrderEntity>;
  findById(
    orderId: string,
    session?: ClientSession,
  ): Promise<OrderEntity | null>;
  findByStoreAndParticipant(
    storeId: string,
    participantId: string,
  ): Promise<OrderEntity | null>;
  update(
    orderId: string,
    input: UpdateOrderInput,
    options?: UpdateOrderOptions,
  ): Promise<OrderEntity | null>;
  listByStore(input: ListOrdersByStoreInput): Promise<OrderEntity[]>;
  countByStore(
    input: Omit<ListOrdersByStoreInput, 'skip' | 'limit'>,
  ): Promise<number>;
};

export const orderRepository: OrderRepository = orderMongoRepository;
