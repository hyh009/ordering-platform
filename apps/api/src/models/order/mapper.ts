import {
  toCartItemDto,
  toOrderingParticipantDto,
} from '@src/models/cart/mapper';

import { allocateServiceFee, canGuestExtendOrder } from './model';

import type { OrderBatchSnapshot, OrderEntity } from './model';
import type {
  OrderBatchDto,
  OrderDto,
  OrderParticipantAmountDto,
  OrderSummaryDto,
} from '@repo/shared';

function toOrderBatchDto(batch: OrderBatchSnapshot): OrderBatchDto {
  const dto: OrderBatchDto = {
    id: batch.id,
    batchNumber: batch.batchNumber,
    status: batch.status,
    submittedAt: batch.submittedAt.toISOString(),
    items: batch.items.map(toCartItemDto),
    subtotal: batch.subtotal,
  };

  if (batch.submittedByParticipantId !== undefined) {
    dto.submittedByParticipantId = batch.submittedByParticipantId;
  }

  if (batch.confirmedAt !== undefined) {
    dto.confirmedAt = batch.confirmedAt.toISOString();
  }

  if (batch.readyAt !== undefined) {
    dto.readyAt = batch.readyAt.toISOString();
  }

  if (batch.cancelledAt !== undefined) {
    dto.cancelledAt = batch.cancelledAt.toISOString();
  }

  return dto;
}

/**
 * Build the per-participant amount breakdown for an order.
 *
 * Item-subtotal attribution rule (each item is attributed to exactly one
 * participant present in `order.participants`):
 *   1. Resolve the owner as `item.addedByParticipantId ?? batch.submittedByParticipantId`.
 *   2. If the resolved owner is not a current order participant, fall back to
 *      `batch.submittedByParticipantId`.
 *   3. If the submitter is also absent or not a current participant, fall back
 *      to the first participant as a last resort.
 * This guarantees every item's value lands on some participant, so the
 * per-participant `itemSubtotal` values sum exactly to `order.subtotal`. The
 * service fee is then split across those subtotals with largest-remainder
 * rounding, so `serviceFeeAmount` reconciles to `order.serviceFeeAmount` and
 * `totalAmount` reconciles to `order.totalAmount`.
 *
 * Orders with no participants produce an empty breakdown; any item value is
 * left out of the per-person weights, which is harmless because the
 * order-level totals are unchanged.
 */
export function toParticipantAmountDtos(
  order: OrderEntity,
): OrderParticipantAmountDto[] {
  const participantIds = new Set(order.participants.map((p) => p.id));
  const fallbackParticipantId = order.participants[0]?.id;

  const itemSubtotals = new Map<string, number>(
    order.participants.map((p) => [p.id, 0]),
  );

  if (fallbackParticipantId !== undefined) {
    for (const batch of order.batches) {
      for (const item of batch.items) {
        const resolvedOwner =
          item.addedByParticipantId ?? batch.submittedByParticipantId;

        let ownerId: string;
        if (resolvedOwner !== undefined && participantIds.has(resolvedOwner)) {
          ownerId = resolvedOwner;
        } else if (
          batch.submittedByParticipantId !== undefined &&
          participantIds.has(batch.submittedByParticipantId)
        ) {
          ownerId = batch.submittedByParticipantId;
        } else {
          ownerId = fallbackParticipantId;
        }

        itemSubtotals.set(
          ownerId,
          (itemSubtotals.get(ownerId) ?? 0) + item.totalItemPrice,
        );
      }
    }
  }

  const weights = order.participants.map((p) => ({
    participantId: p.id,
    weight: itemSubtotals.get(p.id) ?? 0,
  }));

  const feeAllocations = allocateServiceFee(weights, order.serviceFeeAmount);
  const feeByParticipant = new Map(
    feeAllocations.map((a) => [a.participantId, a.amount]),
  );

  return order.participants.map((p) => {
    const itemSubtotal = itemSubtotals.get(p.id) ?? 0;
    const serviceFeeAmount = feeByParticipant.get(p.id) ?? 0;
    return {
      participantId: p.id,
      itemSubtotal,
      serviceFeeAmount,
      totalAmount: itemSubtotal + serviceFeeAmount,
    };
  });
}

export function toOrderSummaryDto(order: OrderEntity): OrderSummaryDto {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const dto: OrderSummaryDto = {
    id: order.id,
    displayNumber: order.displayNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    orderType: order.orderType,
    checkoutMode: order.checkoutMode,
    businessDate: order.businessDate,
    participantCount: order.participants.length,
    itemCount,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt.toISOString(),
  };

  if (order.tableNumber !== undefined) dto.tableNumber = order.tableNumber;

  return dto;
}

export function toOrderDto(
  order: OrderEntity,
  now: Date = new Date(),
): OrderDto {
  const dto: OrderDto = {
    id: order.id,
    storeId: order.storeId,
    canAddOn: canGuestExtendOrder(order, now),
    orderType: order.orderType,
    checkoutMode: order.checkoutMode,
    businessDate: order.businessDate,
    displayNumber: order.displayNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    participants: order.participants.map(toOrderingParticipantDto),
    items: order.items.map(toCartItemDto),
    batches: order.batches.map(toOrderBatchDto),
    participantAmounts: toParticipantAmountDtos(order),
    subtotal: order.subtotal,
    serviceFeeRate: order.serviceFeeRate,
    serviceFeeAmount: order.serviceFeeAmount,
    totalAmount: order.totalAmount,
    orderingClosesAt: order.orderingClosesAt.toISOString(),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };

  if (order.tableNumber !== undefined) {
    dto.tableNumber = order.tableNumber;
  }

  if (order.notes !== undefined) {
    dto.notes = order.notes;
  }
  if (order.paidAt !== undefined) {
    dto.paidAt = order.paidAt.toISOString();
  }

  if (order.servedAt !== undefined) {
    dto.servedAt = order.servedAt.toISOString();
  }

  if (order.completedAt !== undefined) {
    dto.completedAt = order.completedAt.toISOString();
  }

  if (order.cancelledAt !== undefined) {
    dto.cancelledAt = order.cancelledAt.toISOString();
  }

  return dto;
}
