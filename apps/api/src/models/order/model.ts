import type { OrderCancelReason } from '@repo/shared';
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
  cancelReasons?: OrderCancelReason[];
  cancelNote?: string;
  cancelledBy?: string;
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
  completedAt?: Date;
  cancelledAt?: Date;
  cancelReasons?: OrderCancelReason[];
  cancelNote?: string;
  cancelledBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Forward-only stage order for batch status advancement.
 * `cancelled` is excluded — it is a lateral exit, not a stage.
 * `ready` is the terminal prep stage; there is no further advance beyond it.
 */
export const BATCH_STAGE_ORDER: readonly OrderBatchStatus[] = [
  'pending_confirmation',
  'preparing',
  'ready',
] as const;

/**
 * Whether a batch may be advanced from `from` to `to`.
 * Requires:
 *   - `from` is not a terminal state (`cancelled` or `ready`)
 *   - `to` is strictly later in BATCH_STAGE_ORDER than `from`
 */
export function canAdvanceBatch(
  from: OrderBatchStatus,
  to: OrderBatchStatus,
): boolean {
  if (from === 'cancelled' || from === 'ready') return false;
  const fromIndex = BATCH_STAGE_ORDER.indexOf(from);
  const toIndex = BATCH_STAGE_ORDER.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) return false;
  return toIndex > fromIndex;
}

function hasCompletableBatches(batches: OrderBatchSnapshot[]): boolean {
  if (batches.length === 0) return false;
  const hasActiveReady = batches.some((b) => b.status === 'ready');
  if (!hasActiveReady) return false;
  return batches.every((b) => b.status === 'ready' || b.status === 'cancelled');
}

/**
 * Derive the order status from its batches (rollup).
 * Rules:
 *   - Ignore cancelled batches.
 *   - If no active batches remain (every round was cancelled individually) →
 *     `'pending_confirmation'`. The order stays OPEN so the guest can still add
 *     another round; cancelling rounds rejects food, it does not end the table.
 *     The terminal `'cancelled'` is reserved for an explicit order-level cancel.
 *   - A pay-later order becomes `'completed'` only once payment is collected and
 *     every active batch is ready.
 *   - Otherwise return the slowest (earliest-stage) active batch status,
 *     which maps 1:1 to an OrderStatus of the same name.
 * Never returns `'cancelled'` or `'pending_payment'` — those are set explicitly.
 */
export function rollupOrderStatus(
  batches: OrderBatchSnapshot[],
  order?: Pick<OrderEntity, 'checkoutMode' | 'paymentStatus'>,
): OrderStatus {
  if (
    order?.checkoutMode === 'pay_later' &&
    order.paymentStatus === 'paid' &&
    hasCompletableBatches(batches)
  ) {
    return 'completed';
  }

  const active = batches.filter((b) => b.status !== 'cancelled');
  if (active.length === 0) return 'pending_confirmation';

  let slowestIndex = BATCH_STAGE_ORDER.length - 1;
  for (const batch of active) {
    const idx = BATCH_STAGE_ORDER.indexOf(batch.status);
    if (idx !== -1 && idx < slowestIndex) {
      slowestIndex = idx;
    }
  }
  return BATCH_STAGE_ORDER[slowestIndex] as OrderStatus;
}

/**
 * Recompute an order's active item list and money totals from its batches,
 * excluding cancelled batches. A cancelled round keeps its own items/subtotal
 * for display, but must not count toward the order subtotal/fee/total.
 * Mirrors the pricing formula in guestOrdering `computeTotals`.
 */
export function computeActiveOrderTotals(
  batches: OrderBatchSnapshot[],
  serviceFeeRate: number,
): {
  items: CartItemSnapshot[];
  subtotal: number;
  serviceFeeAmount: number;
  totalAmount: number;
} {
  const items = batches
    .filter((b) => b.status !== 'cancelled')
    .flatMap((b) => b.items);
  const subtotal = items.reduce((sum, item) => sum + item.totalItemPrice, 0);
  const serviceFeeAmount = Math.round(subtotal * serviceFeeRate);

  return {
    items,
    subtotal,
    serviceFeeAmount,
    totalAmount: subtotal + serviceFeeAmount,
  };
}

/**
 * Whether a merchant may mark an order as completed.
 * Requires: order is paid, not already `completed` or `cancelled`, every batch
 * is in {`ready`, `cancelled`}, and at least one batch is not cancelled.
 */
export function canCompleteOrder(order: OrderEntity): boolean {
  if (order.status === 'completed' || order.status === 'cancelled')
    return false;
  if (order.paymentStatus !== 'paid') return false;
  return hasCompletableBatches(order.batches);
}

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

/**
 * Whether a merchant may cancel this order.
 * Cancellation is allowed on any non-terminal status:
 * blocks only `completed` and `cancelled`.
 */
export function canCancelOrder(status: OrderStatus): boolean {
  return status !== 'completed' && status !== 'cancelled';
}

/**
 * Whether a merchant may mark this order as paid (checkout).
 * Blocks if already paid/refunded/voided or if cancelled.
 */
export function canCheckoutOrder(
  order: Pick<OrderEntity, 'status' | 'paymentStatus'>,
): boolean {
  return order.paymentStatus === 'unpaid' && order.status !== 'cancelled';
}
