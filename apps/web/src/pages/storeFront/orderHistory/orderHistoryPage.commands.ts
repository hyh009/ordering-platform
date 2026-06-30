import type { StoreFrontRuntime } from '@/features/storeFront/runtime';

export function createOrderHistoryPageCommands(runtime: StoreFrontRuntime) {
  return {
    async initialize(storeId: string) {
      await runtime.commands.tenant.activateStore(storeId);
      const storefront = await runtime.commands.storefront.loadStore(storeId);
      if (storefront.status === 'failed') return storefront;
      return runtime.commands.orderHistory.loadOrders(storeId);
    },
  };
}
