import { merchantOrderService } from '@/services/order.service';
import {
  mapMerchantApiError,
  type MerchantCommandFailure,
} from '@/services/utils/merchantApiError';

import type {
  AdvanceBatchStatusRequest,
  CancelBatchRequest,
  CancelOrderRequest,
  CheckoutOrderRequest,
  CompleteOrderRequest,
  Order,
} from '@/models/order';

export type OrderMutationResult =
  | { status: 'saved'; order: Order }
  | MerchantCommandFailure;

// Named aliases kept for backwards-compat usage in commands.ts / page layer
export type CancelOrderResult = OrderMutationResult;
export type CheckoutOrderResult = OrderMutationResult;
export type AdvanceBatchStatusResult = OrderMutationResult;
export type CancelBatchResult = OrderMutationResult;
export type CompleteOrderResult = OrderMutationResult;

export type OrderMutationCommands = {
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

export function createOrderMutationCommands(): OrderMutationCommands {
  return {
    async cancelOrder(storeId, orderId, body) {
      try {
        const order = await merchantOrderService.cancelOrder(
          storeId,
          orderId,
          body,
        );
        return { status: 'saved', order };
      } catch (error) {
        return mapMerchantApiError(error);
      }
    },

    async checkoutOrder(storeId, orderId, body) {
      try {
        const order = await merchantOrderService.checkoutOrder(
          storeId,
          orderId,
          body,
        );
        return { status: 'saved', order };
      } catch (error) {
        return mapMerchantApiError(error);
      }
    },

    async advanceBatchStatus(storeId, orderId, batchId, body) {
      try {
        const order = await merchantOrderService.advanceBatchStatus(
          storeId,
          orderId,
          batchId,
          body,
        );
        return { status: 'saved', order };
      } catch (error) {
        return mapMerchantApiError(error);
      }
    },

    async cancelBatch(storeId, orderId, batchId, body) {
      try {
        const order = await merchantOrderService.cancelBatch(
          storeId,
          orderId,
          batchId,
          body,
        );
        return { status: 'saved', order };
      } catch (error) {
        return mapMerchantApiError(error);
      }
    },

    async completeOrder(storeId, orderId, body) {
      try {
        const order = await merchantOrderService.completeOrder(
          storeId,
          orderId,
          body,
        );
        return { status: 'saved', order };
      } catch (error) {
        return mapMerchantApiError(error);
      }
    },
  };
}
