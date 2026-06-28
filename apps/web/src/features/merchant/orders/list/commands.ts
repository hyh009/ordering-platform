import { merchantOrderService } from '@/services/order.service';
import {
  mapMerchantApiError,
  type MerchantCommandFailure,
} from '@/services/utils/merchantApiError';
import type { OrderStatus, OrderPaymentStatus } from '@/models/order';
import type { OrderListActions } from './actions';

export type LoadOrdersQuery = {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
  paymentStatus?: OrderPaymentStatus;
  businessDate?: string;
  q?: string;
};

export type LoadOrdersResult = { status: 'loaded' } | MerchantCommandFailure;

export type OrderListCommands = {
  loadOrders(
    storeId: string,
    query: LoadOrdersQuery,
  ): Promise<LoadOrdersResult>;
};

export function createOrderListCommands(
  actions: OrderListActions,
): OrderListCommands {
  return {
    async loadOrders(storeId, query) {
      actions.loadStarted();

      try {
        const result = await merchantOrderService.listOrders(storeId, query);

        actions.loadSucceeded(result);
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapMerchantApiError(error);

        actions.loadFailed(failure.message);
        return failure;
      }
    },
  };
}
