import type { OrderDetailActions } from '@/features/merchant/orders/detail/actions';
import {
  createOrderDetailCommands,
  type LoadOrderResult,
} from '@/features/merchant/orders/detail/commands';
import {
  createOrderMutationCommands,
  type AdvanceBatchStatusResult,
  type CancelBatchResult,
  type CancelOrderResult,
  type CheckoutOrderResult,
  type CompleteOrderResult,
} from '@/features/merchant/orders/mutations/commands';

import type {
  AdvanceBatchStatusRequest,
  CancelBatchRequest,
  CancelOrderRequest,
  CheckoutOrderRequest,
  CompleteOrderRequest,
} from '@/models/order';

export type OrderDetailPageCommands = {
  loadOrder(storeId: string, orderId: string): Promise<LoadOrderResult>;
  cancelOrder(
    storeId: string,
    orderId: string,
    body: CancelOrderRequest,
  ): Promise<CancelOrderResult>;
  checkoutOrder(
    storeId: string,
    orderId: string,
    body: CheckoutOrderRequest,
  ): Promise<CheckoutOrderResult>;
  advanceBatchStatus(
    storeId: string,
    orderId: string,
    batchId: string,
    body: AdvanceBatchStatusRequest,
  ): Promise<AdvanceBatchStatusResult>;
  cancelBatch(
    storeId: string,
    orderId: string,
    batchId: string,
    body: CancelBatchRequest,
  ): Promise<CancelBatchResult>;
  completeOrder(
    storeId: string,
    orderId: string,
    body: CompleteOrderRequest,
  ): Promise<CompleteOrderResult>;
};

export function createOrderDetailPageCommands(
  actions: OrderDetailActions,
): OrderDetailPageCommands {
  const detailCommands = createOrderDetailCommands(actions);
  const mutationCommands = createOrderMutationCommands();

  return {
    loadOrder: detailCommands.loadOrder,

    async cancelOrder(storeId, orderId, body) {
      const result = await mutationCommands.cancelOrder(storeId, orderId, body);
      if (result.status === 'saved') actions.orderUpdated(result.order);
      return result;
    },

    async checkoutOrder(storeId, orderId, body) {
      const result = await mutationCommands.checkoutOrder(
        storeId,
        orderId,
        body,
      );
      if (result.status === 'saved') actions.orderUpdated(result.order);
      return result;
    },

    async advanceBatchStatus(storeId, orderId, batchId, body) {
      const result = await mutationCommands.advanceBatchStatus(
        storeId,
        orderId,
        batchId,
        body,
      );
      if (result.status === 'saved') actions.orderUpdated(result.order);
      return result;
    },

    async cancelBatch(storeId, orderId, batchId, body) {
      const result = await mutationCommands.cancelBatch(
        storeId,
        orderId,
        batchId,
        body,
      );
      if (result.status === 'saved') actions.orderUpdated(result.order);
      return result;
    },

    async completeOrder(storeId, orderId, body) {
      const result = await mutationCommands.completeOrder(
        storeId,
        orderId,
        body,
      );
      if (result.status === 'saved') actions.orderUpdated(result.order);
      return result;
    },
  };
}
