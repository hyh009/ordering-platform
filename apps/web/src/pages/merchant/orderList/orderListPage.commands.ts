import type { OrderListActions } from '@/features/merchant/orders/list/actions';
import {
  createOrderListCommands,
  type LoadOrdersQuery,
  type LoadOrdersResult,
} from '@/features/merchant/orders/list/commands';

export type OrderListPageCommands = {
  loadOrders(
    storeId: string,
    query: LoadOrdersQuery,
  ): Promise<LoadOrdersResult>;
};

export function createOrderListPageCommands(
  actions: OrderListActions,
): OrderListPageCommands {
  const listCommands = createOrderListCommands(actions);

  return {
    loadOrders: listCommands.loadOrders,
  };
}
