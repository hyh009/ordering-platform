import type { StoreFrontRuntime } from '@/features/storeFront/runtime';
import type { AddCartItemRequest } from '@/models/cart';

export function createMenuPageCommands(runtime: StoreFrontRuntime) {
  return {
    async initialize(storeId: string) {
      await runtime.commands.tenant.activateStore(storeId);
      const [storefront, session] = await Promise.all([
        runtime.commands.storefront.loadStoreWithMenu(storeId),
        runtime.commands.session.restoreSession(storeId),
      ]);
      return { storefront, session };
    },

    addItem(storeId: string, request: AddCartItemRequest) {
      return runtime.commands.cart.addItem(storeId, request);
    },
  };
}
