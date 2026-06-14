import type { GuestRuntime } from '@/features/guest/runtime';

export function createOrderHistoryPageCommands(runtime: GuestRuntime) {
  return {
    async initialize(storeId: string) {
      await runtime.commands.tenant.activateStore(storeId);
      return runtime.commands.orderHistory.loadOrders(storeId);
    },
  };
}
