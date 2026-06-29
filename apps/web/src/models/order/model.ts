import type { OrderDto } from '@repo/shared';
import type { Order } from './types';

export const orderModel = {
  deserialize(dto: OrderDto): Order {
    const order: Order = {
      id: dto.id,
      storeId: dto.storeId,
      orderType: dto.orderType,
      checkoutMode: dto.checkoutMode,
      businessDate: dto.businessDate,
      displayNumber: dto.displayNumber,
      status: dto.status,
      paymentStatus: dto.paymentStatus,
      canAddOn: dto.canAddOn,
      participants: dto.participants,
      items: dto.items,
      batches: dto.batches,
      // Default to [] so a stale/version-skewed DTO (e.g. an order cached
      // before this field existed, or a backend not yet serving it) degrades
      // gracefully instead of crashing consumers that read this array.
      participantAmounts: dto.participantAmounts ?? [],
      subtotal: dto.subtotal,
      serviceFeeRate: dto.serviceFeeRate,
      serviceFeeAmount: dto.serviceFeeAmount,
      totalAmount: dto.totalAmount,
      orderingClosesAt: dto.orderingClosesAt,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    };

    if (dto.tableNumber !== undefined) order.tableNumber = dto.tableNumber;
    if (dto.notes !== undefined) order.notes = dto.notes;
    if (dto.paidAt !== undefined) order.paidAt = dto.paidAt;
    if (dto.completedAt !== undefined) order.completedAt = dto.completedAt;
    if (dto.cancelledAt !== undefined) order.cancelledAt = dto.cancelledAt;
    if (dto.cancelReasons !== undefined) order.cancelReasons = dto.cancelReasons;
    if (dto.cancelNote !== undefined) order.cancelNote = dto.cancelNote;
    if (dto.cancelledBy !== undefined) order.cancelledBy = dto.cancelledBy;

    return order;
  },
};
