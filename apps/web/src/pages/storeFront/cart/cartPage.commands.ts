import type { StoreFrontRuntime } from '@/features/storeFront/runtime';
import type { SubmitCartRequest, UpdateCartItemRequest } from '@/models/cart';

export function createCartPageCommands(runtime: StoreFrontRuntime) {
  return {
    async initialize(storeId: string) {
      await runtime.commands.tenant.activateStore(storeId);
      const session = await runtime.commands.session.restoreSession(storeId);
      if (session.status === 'none') return session;
      const result = await runtime.commands.cart.loadCart(storeId);
      if (
        result.status === 'failed' &&
        (result.reason === 'session-expired' ||
          result.reason === 'session-store-mismatch')
      ) {
        return { status: 'none' as const };
      }
      // No live draft cart (it is terminal, or an order already exists). Instead
      // of dead-ending on the cart, resolve the combined session and hand the
      // participant to order tracking when an order exists. This removes the
      // post-checkout CART_NOT_ACTIVE dead-end.
      if (result.status === 'failed' && result.reason === 'cart-not-active') {
        const resumed = await runtime.commands.session.resumeSession(storeId);
        if (resumed.status === 'order') {
          return { status: 'order' as const, orderId: resumed.orderId };
        }
        return { status: 'none' as const };
      }
      return result;
    },

    removeItem(storeId: string, itemId: string) {
      return runtime.commands.cart.removeItem(storeId, itemId);
    },

    updateItem(
      storeId: string,
      itemId: string,
      request: UpdateCartItemRequest,
    ) {
      return runtime.commands.cart.updateItem(storeId, itemId, request);
    },

    submit(storeId: string, request: SubmitCartRequest) {
      return runtime.commands.cart.submitCart(storeId, request);
    },
  };
}
