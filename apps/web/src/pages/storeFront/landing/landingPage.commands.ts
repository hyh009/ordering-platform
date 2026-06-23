import type { StoreFrontRuntime } from '@/features/storeFront/runtime';
import type { CreateCartRequest } from '@/models/cart';
import { isOrderFinished } from '@/models/order';

export function createLandingPageCommands(runtime: StoreFrontRuntime) {
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

    if (session.status === 'order') {
      const order = runtime.stores.order.getState().order;
      if (order && !isOrderFinished(order)) {
        // An unfinished order is a live obligation (and leaving only forgets it
        // locally, it does not cancel it on the server). Force the guest to
        // resume it instead of abandoning it to start another order.
        return { status: 'blocked' as const, orderId: session.orderId };
      }
      runtime.commands.session.clearSession(storeId);
      return { status: 'left' as const };
    }

    if (session.status === 'none' || session.status === 'ended') {
      runtime.commands.session.clearSession(storeId);
      return { status: 'left' as const };
    }

    return session;
  }

  // Read-only: is the current stored session an order that is not finished yet?
  // Used to block "new order"/"join" before showing a leave confirmation.
  async function currentOrderIsOpen(storeId: string): Promise<boolean> {
    await runtime.commands.tenant.activateStore(storeId);
    const session = await runtime.commands.session.resumeSession(storeId);
    if (session.status !== 'order') return false;
    const order = runtime.stores.order.getState().order;
    return !!order && !isOrderFinished(order);
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
    currentOrderIsOpen,
  };
}
