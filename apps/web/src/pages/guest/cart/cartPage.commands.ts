import type { GuestRuntime } from '@/features/guest/runtime';
import type { SubmitCartRequest, UpdateCartItemRequest } from '@/models/cart';

export function createCartPageCommands(runtime: GuestRuntime) {
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
