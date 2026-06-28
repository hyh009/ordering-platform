import { merchantOrderService } from '@/services/order.service';
import {
  mapMerchantApiError,
  type MerchantCommandFailure,
} from '@/services/utils/merchantApiError';
import type { OrderDetailActions } from './actions';

export type LoadOrderResult = { status: 'loaded' } | MerchantCommandFailure;

export type OrderDetailCommands = {
  loadOrder(storeId: string, orderId: string): Promise<LoadOrderResult>;
};

export function createOrderDetailCommands(
  actions: OrderDetailActions,
): OrderDetailCommands {
  return {
    async loadOrder(storeId, orderId) {
      actions.loadStarted();

      try {
        const order = await merchantOrderService.getOrder(storeId, orderId);

        actions.loadSucceeded(order);
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapMerchantApiError(error);

        actions.loadFailed(failure.message);
        return failure;
      }
    },
  };
}
