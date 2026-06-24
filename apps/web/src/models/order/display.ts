import type { OrderParticipantAmountDto } from '@repo/shared';

import type { AppTranslator } from '@/app/i18n';
import type {
  Order,
  OrderBatchStatus,
  OrderPaymentStatus,
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
    case 'served':
      return tDefault('order.status.served', 'Served');
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

export function isOrderFinished(order: Order): boolean {
  return order.status === 'completed' || order.status === 'cancelled';
}

export function getParticipantAmount(
  order: Order,
  participantId: string,
): OrderParticipantAmountDto | undefined {
  return order.participantAmounts.find(
    (a) => a.participantId === participantId,
  );
}
