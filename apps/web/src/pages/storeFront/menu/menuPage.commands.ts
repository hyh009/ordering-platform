import type { StoreFrontRuntime } from '@/features/storeFront/runtime';
import type { AddCartItemRequest } from '@/models/cart';

export function createMenuPageCommands(runtime: StoreFrontRuntime) {
  return {
    async initialize(storeId: string) {
      await runtime.commands.tenant.activateStore(storeId);
      const [storefront, session] = await Promise.all([
        runtime.commands.storefront.loadStoreWithMenu(storeId),
        // Resume over the network so the menu reflects the live cart/order
        // (e.g. the pay-later add-on banner) even on a hard refresh. Ongoing
        // freshness will come from SSE later.
        runtime.commands.session.resumeSession(storeId),
      ]);
      return { storefront, session };
    },

    addItem(storeId: string, request: AddCartItemRequest) {
      return runtime.commands.cart.addItem(storeId, request);
    },
  };
}
