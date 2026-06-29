import { toOrderDto, toOrderSummaryDto } from '@src/models/order/mapper';
import {
  canAdvanceBatch,
  canCancelOrder,
  canCheckoutOrder,
  canCompleteOrder,
  computeActiveOrderTotals,
  rollupOrderStatus,
} from '@src/models/order/model';
import { orderRepository } from '@src/repositories/order/repository';
import { emitOrderUpdated } from '@src/services/guestOrdering/guestOrdering.sse.service';
import { ERROR_CODES } from '@src/utils/errorCode';
import { ConflictError, NotFoundError } from '@src/utils/errors';

import type {
  GetMerchantOrderSuccessResponse,
  ListOrdersQuery,
  ListOrdersSuccessResponse,
  OrderCancelReason,
} from '@repo/shared';
import type { OrderBatchStatus } from '@src/models/order/model';

type ListOrdersResult = ListOrdersSuccessResponse['data'];
type GetOrderResult = GetMerchantOrderSuccessResponse['data'];

export class OrderService {
  public async listOrders(
    storeId: string,
    query: ListOrdersQuery,
  ): Promise<ListOrdersResult> {
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const [orders, total] = await Promise.all([
      orderRepository.listByStore({
        storeId,
        status: query.status,
        paymentStatus: query.paymentStatus,
        businessDate: query.businessDate,
        q: query.q,
        skip,
        limit: pageSize,
      }),
      orderRepository.countByStore({
        storeId,
        status: query.status,
        paymentStatus: query.paymentStatus,
        businessDate: query.businessDate,
        q: query.q,
      }),
    ]);

    return {
      orders: orders.map(toOrderSummaryDto),
      total,
      page,
      pageSize,
    };
  }

  public async getOrder(
    storeId: string,
    orderId: string,
  ): Promise<GetOrderResult> {
    const order = await orderRepository.findById(orderId);

    if (!order || order.storeId !== storeId) {
      throw new NotFoundError('Order not found', ERROR_CODES.ORDER_NOT_FOUND);
    }

    return { order: toOrderDto(order) };
  }

  public async cancelOrder(
    storeId: string,
    orderId: string,
    input: {
      reasons?: OrderCancelReason[] | undefined;
      note?: string | undefined;
      cancelledBy: string;
      expectedUpdatedAt?: Date | undefined;
    },
  ): Promise<GetOrderResult> {
    const order = await orderRepository.findById(orderId);

    if (!order || order.storeId !== storeId) {
      throw new NotFoundError('Order not found', ERROR_CODES.ORDER_NOT_FOUND);
    }

    if (!canCancelOrder(order.status)) {
      throw new ConflictError(
        'Order can no longer be cancelled',
        ERROR_CODES.ORDER_LOCKED,
      );
    }

    const paymentStatus =
      order.paymentStatus === 'paid' ? 'voided' : order.paymentStatus;
    const now = new Date();

    const updated = await orderRepository.update(
      orderId,
      {
        status: 'cancelled',
        cancelledAt: now,
        cancelReasons: input.reasons,
        cancelNote: input.note,
        cancelledBy: input.cancelledBy,
        paymentStatus,
      },
      { expectedUpdatedAt: input.expectedUpdatedAt },
    );

    if (!updated) {
      throw new ConflictError(
        'Order was changed by another request. Please refresh and retry.',
        ERROR_CODES.ORDER_LOCKED,
      );
    }

    if (updated.cartId) {
      try {
        emitOrderUpdated(updated.cartId, toOrderDto(updated));
      } catch {
        // best-effort — SSE failure must not block the mutation response
      }
    }

    return { order: toOrderDto(updated) };
  }

  public async advanceBatchStatus(
    storeId: string,
    orderId: string,
    batchId: string,
    targetStatus: OrderBatchStatus,
    expectedUpdatedAt?: Date,
  ): Promise<GetOrderResult> {
    const order = await orderRepository.findById(orderId);

    if (!order || order.storeId !== storeId) {
      throw new NotFoundError('Order not found', ERROR_CODES.ORDER_NOT_FOUND);
    }

    const batchIndex = order.batches.findIndex((b) => b.id === batchId);
    if (batchIndex === -1) {
      throw new NotFoundError('Order not found', ERROR_CODES.ORDER_NOT_FOUND);
    }

    const batch = order.batches[batchIndex]!;

    if (!canAdvanceBatch(batch.status, targetStatus)) {
      throw new ConflictError(
        'Batch cannot be advanced to the requested status',
        ERROR_CODES.ORDER_LOCKED,
      );
    }

    const now = new Date();
    const nextBatch = { ...batch, status: targetStatus } as typeof batch;

    if (targetStatus === 'preparing') {
      nextBatch.confirmedAt = now;
    } else if (targetStatus === 'ready') {
      nextBatch.readyAt = now;
    } else if (targetStatus === 'served') {
      nextBatch.servedAt = now;
    }

    const nextBatches = order.batches.map((b, i) =>
      i === batchIndex ? nextBatch : b,
    );
    const nextStatus = rollupOrderStatus(nextBatches);

    const updated = await orderRepository.update(
      orderId,
      { batches: nextBatches, status: nextStatus },
      { expectedUpdatedAt },
    );

    if (!updated) {
      throw new ConflictError(
        'Order was changed by another request. Please refresh and retry.',
        ERROR_CODES.ORDER_LOCKED,
      );
    }

    if (updated.cartId) {
      try {
        emitOrderUpdated(updated.cartId, toOrderDto(updated));
      } catch {
        // best-effort — SSE failure must not block the mutation response
      }
    }

    return { order: toOrderDto(updated) };
  }

  public async cancelBatch(
    storeId: string,
    orderId: string,
    batchId: string,
    input: {
      reasons?: OrderCancelReason[] | undefined;
      note?: string | undefined;
      cancelledBy: string;
      expectedUpdatedAt?: Date | undefined;
    },
  ): Promise<GetOrderResult> {
    const order = await orderRepository.findById(orderId);

    if (!order || order.storeId !== storeId) {
      throw new NotFoundError('Order not found', ERROR_CODES.ORDER_NOT_FOUND);
    }

    const batchIndex = order.batches.findIndex((b) => b.id === batchId);
    if (batchIndex === -1) {
      throw new NotFoundError('Order not found', ERROR_CODES.ORDER_NOT_FOUND);
    }

    const batch = order.batches[batchIndex]!;

    if (batch.status === 'cancelled' || batch.status === 'served') {
      throw new ConflictError(
        'Batch is in a terminal state and cannot be cancelled',
        ERROR_CODES.ORDER_LOCKED,
      );
    }

    const now = new Date();
    const nextBatch: typeof batch = {
      ...batch,
      status: 'cancelled' as const,
      cancelledAt: now,
      cancelledBy: input.cancelledBy,
      ...(input.reasons !== undefined ? { cancelReasons: input.reasons } : {}),
      ...(input.note !== undefined ? { cancelNote: input.note } : {}),
    };

    const nextBatches = order.batches.map((b, i) =>
      i === batchIndex ? nextBatch : b,
    );
    const nextStatus = rollupOrderStatus(nextBatches);
    const totals = computeActiveOrderTotals(nextBatches, order.serviceFeeRate);

    const updated = await orderRepository.update(
      orderId,
      {
        batches: nextBatches,
        status: nextStatus,
        items: totals.items,
        subtotal: totals.subtotal,
        serviceFeeAmount: totals.serviceFeeAmount,
        totalAmount: totals.totalAmount,
      },
      { expectedUpdatedAt: input.expectedUpdatedAt },
    );

    if (!updated) {
      throw new ConflictError(
        'Order was changed by another request. Please refresh and retry.',
        ERROR_CODES.ORDER_LOCKED,
      );
    }

    if (updated.cartId) {
      try {
        emitOrderUpdated(updated.cartId, toOrderDto(updated));
      } catch {
        // best-effort — SSE failure must not block the mutation response
      }
    }

    return { order: toOrderDto(updated) };
  }

  public async completeOrder(
    storeId: string,
    orderId: string,
    expectedUpdatedAt?: Date,
  ): Promise<GetOrderResult> {
    const order = await orderRepository.findById(orderId);

    if (!order || order.storeId !== storeId) {
      throw new NotFoundError('Order not found', ERROR_CODES.ORDER_NOT_FOUND);
    }

    if (!canCompleteOrder(order)) {
      throw new ConflictError(
        'Order cannot be completed in its current state',
        ERROR_CODES.ORDER_LOCKED,
      );
    }

    const now = new Date();

    const updated = await orderRepository.update(
      orderId,
      { status: 'completed', completedAt: now },
      { expectedUpdatedAt },
    );

    if (!updated) {
      throw new ConflictError(
        'Order was changed by another request. Please refresh and retry.',
        ERROR_CODES.ORDER_LOCKED,
      );
    }

    if (updated.cartId) {
      try {
        emitOrderUpdated(updated.cartId, toOrderDto(updated));
      } catch {
        // best-effort — SSE failure must not block the mutation response
      }
    }

    return { order: toOrderDto(updated) };
  }

  public async checkoutOrder(
    storeId: string,
    orderId: string,
    input: {
      actingUserId: string;
      expectedUpdatedAt?: Date | undefined;
    },
  ): Promise<GetOrderResult> {
    const order = await orderRepository.findById(orderId);

    if (!order || order.storeId !== storeId) {
      throw new NotFoundError('Order not found', ERROR_CODES.ORDER_NOT_FOUND);
    }

    if (!canCheckoutOrder(order)) {
      throw new ConflictError(
        'Order cannot be checked out in its current state',
        ERROR_CODES.ORDER_LOCKED,
      );
    }

    const nextStatus =
      order.status === 'pending_payment'
        ? 'pending_confirmation'
        : order.status;
    const now = new Date();

    const updated = await orderRepository.update(
      orderId,
      {
        paymentStatus: 'paid',
        paidAt: now,
        status: nextStatus,
      },
      { expectedUpdatedAt: input.expectedUpdatedAt },
    );

    if (!updated) {
      throw new ConflictError(
        'Order was changed by another request. Please refresh and retry.',
        ERROR_CODES.ORDER_LOCKED,
      );
    }

    if (updated.cartId) {
      try {
        emitOrderUpdated(updated.cartId, toOrderDto(updated));
      } catch {
        // best-effort — SSE failure must not block the mutation response
      }
    }

    return { order: toOrderDto(updated) };
  }
}

export function createOrderService() {
  return new OrderService();
}

export const orderService = createOrderService();
