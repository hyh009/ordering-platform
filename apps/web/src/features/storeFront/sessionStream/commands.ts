import type { GuestSessionStore } from '@/app/global/guestSession/guestSession.store';
import type { GuestSessionCommands } from '@/app/global/guestSession/guestSession.commands';
import { storeFrontGuestStreamService } from '@/services/storeFrontGuestStream.service';
import type { Cart } from '@/models/cart';
import { isOrderFinished, type Order } from '@/models/order';
import type { StoreFrontCartActions } from '../cart/actions';
import type { StoreFrontOrderActions } from '../order/actions';
import type { StoreFrontOrderHistoryCommands } from '../orderHistory/commands';
import type { TenantStore } from '../tenant/store';

export type StoreFrontSessionStreamCommands = {
  /**
   * Opens the guest session SSE stream for the given store and routes pushed
   * snapshots into the cart/order stores. No-ops when there is no scoped guest
   * token. Returns a disposer the VM must call on unmount.
   */
  connectSessionStream(storeId: string): () => void;
};

export function createStoreFrontSessionStreamCommands(deps: {
  cartActions: StoreFrontCartActions;
  guestSessionCommands: GuestSessionCommands;
  orderActions: StoreFrontOrderActions;
  orderHistoryCommands: StoreFrontOrderHistoryCommands;
  sessionStore: GuestSessionStore;
  tenantStore: TenantStore;
}): StoreFrontSessionStreamCommands {
  const {
    cartActions,
    guestSessionCommands,
    orderActions,
    orderHistoryCommands,
    sessionStore,
    tenantStore,
  } = deps;

  // A pushed snapshot may land after the user has switched stores or the
  // session token has been replaced. Mirror the cart command guards so a stale
  // stream can never clobber the now-active store's state.
  function isScoped(expectedStoreId: string, token: string): boolean {
    if (tenantStore.getState().activeStoreId !== expectedStoreId) return false;
    const session = sessionStore.getState();
    return session.guestToken === token && session.storeId === expectedStoreId;
  }

  return {
    connectSessionStream(storeId) {
      const session = sessionStore.getState();
      const token = session.guestToken;

      // No active guest session for this store: nothing to stream.
      if (
        !token ||
        session.storeId !== storeId ||
        tenantStore.getState().activeStoreId !== storeId
      ) {
        return () => {};
      }

      const connection = storeFrontGuestStreamService.subscribeGuestStream(
        token,
        {
          onCartUpdated(cart: Cart) {
            if (!isScoped(storeId, token)) return;
            cartActions.cartUpdated(cart);
          },
          onOrderUpdated(order: Order) {
            if (!isScoped(storeId, token)) return;
            if (order.storeId !== storeId) return;
            const finished = isOrderFinished(order);
            orderActions.orderUpdated(order);
            orderHistoryCommands.recordOrder(storeId, order, token);
            if (!order.canAddOn || finished) {
              cartActions.cartCleared();
            }
            if (finished) {
              guestSessionCommands.clearSession(storeId);
            }
          },
        },
      );

      return () => {
        connection.close();
      };
    },
  };
}
