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
};

export type OrderRepository = {
  create(input: CreateOrderInput): Promise<OrderEntity>;
  findById(orderId: string): Promise<OrderEntity | null>;
  update(
    orderId: string,
    input: UpdateOrderInput,
    options?: UpdateOrderOptions,
  ): Promise<OrderEntity | null>;
};

export const orderRepository: OrderRepository = orderMongoRepository;
