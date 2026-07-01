import type { AppTranslator } from '@/app/i18n';
import type {
  Order,
  OrderBatchStatus,
  OrderCancelReason,
  OrderPaymentStatus,
  OrderParticipantAmount,
  OrderStatus,
} from './types';

export function getOrderStatusLabel(
  status: OrderStatus,
  tDefault: AppTranslator,
) {
  switch (status) {
    case 'pending_payment':
      return tDefault('order.status.pendingPayment', 'Awaiting payment');
    case 'pending_confirmation':
      return tDefault(
        'order.status.pendingConfirmation',
        'Awaiting confirmation',
      );
    case 'preparing':
      return tDefault('order.status.preparing', 'Preparing');
    case 'ready':
      return tDefault('order.status.ready', 'Ready for pickup');
    case 'completed':
      return tDefault('order.status.completed', 'Completed');
    case 'cancelled':
      return tDefault('order.status.cancelled', 'Cancelled');
  }
}

export function getOrderPaymentStatusLabel(
  status: OrderPaymentStatus,
  tDefault: AppTranslator,
) {
  switch (status) {
    case 'unpaid':
      return tDefault('order.paymentStatus.unpaid', 'Unpaid');
    case 'paid':
      return tDefault('order.paymentStatus.paid', 'Paid');
    case 'refunded':
      return tDefault('order.paymentStatus.refunded', 'Refunded');
    case 'voided':
      return tDefault('order.paymentStatus.voided', 'Voided');
  }
}

export function getOrderBatchStatusLabel(
  status: OrderBatchStatus,
  tDefault: AppTranslator,
) {
  switch (status) {
    case 'pending_confirmation':
      return tDefault(
        'order.batchStatus.pendingConfirmation',
        'Awaiting confirmation',
      );
    case 'preparing':
      return tDefault('order.batchStatus.preparing', 'Preparing');
    case 'ready':
      return tDefault('order.batchStatus.ready', 'Ready');
    case 'cancelled':
      return tDefault('order.batchStatus.cancelled', 'Cancelled');
  }
}

/**
 * The next status for a batch, and the action-button label for advancing to it.
 * Returns null when the batch is in a terminal state (ready or cancelled).
 * Mirrors the forward-only lifecycle: pending_confirmation → preparing → ready.
 */
export function getNextBatchStatus(
  status: OrderBatchStatus,
  tDefault: AppTranslator,
): { status: OrderBatchStatus; label: string } | null {
  switch (status) {
    case 'pending_confirmation':
      return {
        status: 'preparing',
        label: tDefault('order.batchAction.startPreparing', 'Start preparing'),
      };
    case 'preparing':
      return {
        status: 'ready',
        label: tDefault('order.batchAction.markReady', 'Mark ready'),
      };
    case 'ready':
    case 'cancelled':
      return null;
  }
}

/**
 * Whether the merchant may complete this order.
 * Mirrors the backend `canCompleteOrder` predicate in api/src/models/order/model.ts.
 * Requires: payment is collected, every batch ∈ {ready, cancelled}, and at
 * least one not cancelled.
 */
export function canCompleteOrder(
  order: Pick<Order, 'status' | 'paymentStatus' | 'batches'>,
): boolean {
  if (order.status === 'completed' || order.status === 'cancelled')
    return false;
  if (order.paymentStatus !== 'paid') return false;
  if (order.batches.length === 0) return false;
  const hasActiveReady = order.batches.some((b) => b.status === 'ready');
  if (!hasActiveReady) return false;
  return order.batches.every(
    (b) => b.status === 'ready' || b.status === 'cancelled',
  );
}

export function isOrderFinished(order: Order): boolean {
  return order.status === 'completed' || order.status === 'cancelled';
}

export function getOrderCancelReasonLabel(
  reason: OrderCancelReason,
  tDefault: AppTranslator,
): string {
  switch (reason) {
    case 'no_show':
      return tDefault('order.cancelReason.noShow', 'No show');
    case 'out_of_stock':
      return tDefault('order.cancelReason.outOfStock', 'Out of stock');
    case 'customer_request':
      return tDefault('order.cancelReason.customerRequest', 'Customer request');
    case 'other':
      return tDefault('order.cancelReason.other', 'Other');
  }
}

/**
 * Whether the merchant may cancel this order.
 * Mirrors the backend `canCancelOrder` predicate in api/src/models/order/model.ts.
 * Allowed on any non-terminal status (not `completed` or `cancelled`).
 */
export function canCancelOrder(order: Pick<Order, 'status'>): boolean {
  return order.status !== 'completed' && order.status !== 'cancelled';
}

/**
 * Whether the merchant may mark this order as paid (checkout).
 * Mirrors the backend `canCheckoutOrder` predicate in api/src/models/order/model.ts.
 * Blocked if already paid/refunded/voided or if cancelled.
 */
export function canCheckoutOrder(
  order: Pick<Order, 'status' | 'paymentStatus'>,
): boolean {
  return order.paymentStatus === 'unpaid' && order.status !== 'cancelled';
}

export function getParticipantAmount(
  order: Order,
  participantId: string,
): OrderParticipantAmount | undefined {
  return order.participantAmounts.find(
    (a) => a.participantId === participantId,
  );
}
