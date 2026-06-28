import type { OrderSummary, OrderSummaryDto } from './types';

export const orderSummaryModel = {
  deserialize(dto: OrderSummaryDto): OrderSummary {
    const summary: OrderSummary = {
      id: dto.id,
      displayNumber: dto.displayNumber,
      status: dto.status,
      paymentStatus: dto.paymentStatus,
      orderType: dto.orderType,
      checkoutMode: dto.checkoutMode,
      businessDate: dto.businessDate,
      participantCount: dto.participantCount,
      itemCount: dto.itemCount,
      totalAmount: dto.totalAmount,
      createdAt: dto.createdAt,
    };

    if (dto.tableNumber !== undefined) summary.tableNumber = dto.tableNumber;

    return summary;
  },
};
