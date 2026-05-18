import type {
  CartItemSnapshot,
  OrderingParticipantSnapshot,
} from '@src/models/cart/model';
import type {
  StoreOrderType,
  StoreSettingsCheckoutMode,
} from '@src/models/storeSettings/model';

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

export type OrderBatchSnapshot = {
  id: string;
  batchNumber: number;
  status: OrderBatchStatus;
  submittedAt: Date;
  submittedByParticipantId?: string;
  confirmedAt?: Date;
  readyAt?: Date;
  cancelledAt?: Date;
  items: CartItemSnapshot[];
  subtotal: number;
};

export type OrderEntity = {
  id: string;
  organizationId: string;
  cartId?: string;
  orderType: StoreOrderType;
  checkoutMode: StoreSettingsCheckoutMode;
  businessDate: string;
  dailySequence: number;
  displayNumber: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  tableNumber?: string;
  participants: OrderingParticipantSnapshot[];
  items: CartItemSnapshot[];
  batches: OrderBatchSnapshot[];
  notes?: string;
  subtotal: number;
  serviceFeeRate: number;
  serviceFeeAmount: number;
  totalAmount: number;
  paidAt?: Date;
  servedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};
