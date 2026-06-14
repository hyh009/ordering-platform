import type { GuestRuntime } from '@/features/guest/runtime';
import type { CreateCartRequest } from '@/models/cart';

export function createLandingPageCommands(runtime: GuestRuntime) {
  async function abandonCurrentSession(storeId: string) {
    await runtime.commands.tenant.activateStore(storeId);
    const session = await runtime.commands.session.resumeSession(storeId);

    if (session.status === 'cart') {
      const result = await runtime.commands.cart.leaveCart(storeId);
      if (
        result.status === 'failed' &&
        (result.reason === 'session-expired' ||
          result.reason === 'cart-not-active')
      ) {
        runtime.commands.session.clearSession(storeId);
        return { status: 'left' as const };
      }
      return result;
    }

    if (
      session.status === 'none' ||
      session.status === 'ended' ||
      session.status === 'order'
    ) {
      runtime.commands.session.clearSession(storeId);
      return { status: 'left' as const };
    }

    return session;
  }

  return {
    async initialize(storeId: string) {
      await runtime.commands.tenant.activateStore(storeId);
      const storefront = await runtime.commands.storefront.loadStore(storeId);
      return {
        storefront,
        hasStoredSession: runtime.commands.session.hasStoredSession(storeId),
        hasOrderHistory: runtime.commands.orderHistory.hasHistory(storeId),
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

    abandonCurrentSession,
  };
}
