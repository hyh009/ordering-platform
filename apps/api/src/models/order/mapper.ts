import {
  toCartItemDto,
  toOrderingParticipantDto,
} from '@src/models/cart/mapper';

import { canGuestExtendOrder } from './model';

import type { OrderBatchSnapshot, OrderEntity } from './model';
import type { OrderBatchDto, OrderDto } from '@repo/shared';

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
