import type { GuestRuntime } from '@/features/guest/runtime';
import type { JoinCartRequest } from '@/models/cart';

export function createJoinPageCommands(runtime: GuestRuntime) {
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
