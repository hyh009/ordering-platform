import type { GuestRuntime } from '@/features/guest/runtime';
import type { CreateCartRequest } from '@/models/cart';

export function createLandingPageCommands(runtime: GuestRuntime) {
  return {
    async initialize(storeId: string) {
      await runtime.commands.tenant.activateStore(storeId);
      const storefront =
        await runtime.commands.storefront.loadStorefront(storeId);
      return {
        storefront,
        hasStoredSession: runtime.commands.session.hasStoredSession(storeId),
      };
    },

    async resume(storeId: string) {
      await runtime.commands.tenant.activateStore(storeId);
      const result = await runtime.commands.session.resumeSession(storeId);
      if (
        result.status === 'failed' &&
        result.reason === 'session-store-mismatch'
      ) {
        return { status: 'none' as const };
      }
      return result;
    },

    async startOrder(storeId: string, request: CreateCartRequest) {
      await runtime.commands.tenant.activateStore(storeId);
      return runtime.commands.cart.createCart(storeId, request);
    },
  };
}
