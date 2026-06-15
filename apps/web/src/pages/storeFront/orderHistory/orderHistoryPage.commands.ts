import type { StoreFrontRuntime } from '@/features/storeFront/runtime';

export function createOrderHistoryPageCommands(runtime: StoreFrontRuntime) {
  return {
    async initialize(storeId: string) {
      await runtime.commands.tenant.activateStore(storeId);
      return runtime.commands.orderHistory.loadOrders(storeId);
    },
  };
}
