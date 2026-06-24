import type {
  CartItemSnapshot,
  OrderingParticipantSnapshot,
} from '@src/models/cart/model';
import type {
  StoreCheckoutMode,
  StoreOrderType,
} from '@src/models/store/model';

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
  storeId: string;
  cartId?: string;
  orderType: StoreOrderType;
  checkoutMode: StoreCheckoutMode;
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
  orderingClosesAt: Date;
  paidAt?: Date;
  servedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Split a whole-dollar service fee across participants in proportion to their
 * weights using the largest-remainder method, so the returned amounts always
 * sum back to `totalFee` exactly (no rounding drift). Intended for TWD
 * whole-dollar amounts: weights are non-negative item subtotals.
 *
 * Determinism: the extra leftover dollars go to the participants with the
 * largest fractional remainders; ties are broken by earlier input index. The
 * returned array preserves the input order.
 */
export function allocateServiceFee(
  weights: { participantId: string; weight: number }[],
  totalFee: number,
): { participantId: string; amount: number }[] {
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);

  if (totalWeight <= 0 || totalFee <= 0) {
    return weights.map((w) => ({ participantId: w.participantId, amount: 0 }));
  }

  const shares = weights.map((w, index) => {
    const rawShare = (totalFee * w.weight) / totalWeight;
    const base = Math.floor(rawShare);
    return {
      participantId: w.participantId,
      index,
      base,
      fraction: rawShare - base,
    };
  });

  const baseTotal = shares.reduce((sum, s) => sum + s.base, 0);
  let leftover = totalFee - baseTotal;

  // Distribute leftover dollars to the largest fractions; earlier index wins
  // ties so the result is fully deterministic.
  const order = [...shares].sort((a, b) => {
    if (b.fraction !== a.fraction) {
      return b.fraction - a.fraction;
    }
    return a.index - b.index;
  });

  const extra = new Set<number>();
  for (const share of order) {
    if (leftover <= 0) {
      break;
    }
    extra.add(share.index);
    leftover -= 1;
  }

  // Return amounts in the original input order.
  return shares.map((s) => ({
    participantId: s.participantId,
    amount: s.base + (extra.has(s.index) ? 1 : 0),
  }));
}

/**
 * Whether a guest may still add another batch to this order: a dine-in
 * pay-later order that is unpaid, not finished, and before its ordering
 * deadline. Single source of truth for both the reusable-cart submit flow and
 * the `canAddOn` flag exposed on the order DTO.
 */
export function canGuestExtendOrder(order: OrderEntity, now: Date): boolean {
  return (
    order.orderType === 'dine_in' &&
    order.checkoutMode === 'pay_later' &&
    order.paymentStatus === 'unpaid' &&
    order.status !== 'completed' &&
    order.status !== 'cancelled' &&
    now.getTime() < order.orderingClosesAt.getTime()
  );
}
