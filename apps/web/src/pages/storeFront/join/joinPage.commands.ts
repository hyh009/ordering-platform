import type { StoreFrontRuntime } from '@/features/storeFront/runtime';
import type { JoinCartRequest } from '@/models/cart';

export function createJoinPageCommands(runtime: StoreFrontRuntime) {
  return {
    async initialize(storeId: string) {
      await runtime.commands.tenant.activateStore(storeId);
      return runtime.commands.storefront.loadStore(storeId);
    },

    async join(storeId: string, request: JoinCartRequest) {
      await runtime.commands.tenant.activateStore(storeId);
      return runtime.commands.cart.joinCart(storeId, request);
    },
  };
}
