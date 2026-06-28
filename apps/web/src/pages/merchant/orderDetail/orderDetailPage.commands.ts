import type { OrderDetailActions } from '@/features/merchant/orders/detail/actions';
import {
  createOrderDetailCommands,
  type LoadOrderResult,
} from '@/features/merchant/orders/detail/commands';

export type OrderDetailPageCommands = {
  loadOrder(storeId: string, orderId: string): Promise<LoadOrderResult>;
};

export function createOrderDetailPageCommands(
  actions: OrderDetailActions,
): OrderDetailPageCommands {
  const detailCommands = createOrderDetailCommands(actions);

  return {
    loadOrder: detailCommands.loadOrder,
  };
}
