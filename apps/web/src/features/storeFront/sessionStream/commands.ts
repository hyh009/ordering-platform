import type { GuestSessionStore } from '@/app/global/guestSession/guestSession.store';
import { storeFrontGuestStreamService } from '@/services/storeFrontGuestStream.service';
import type { Cart } from '@/models/cart';
import type { Order } from '@/models/order';
import type { StoreFrontCartActions } from '../cart/actions';
import type { StoreFrontOrderActions } from '../order/actions';
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
  orderActions: StoreFrontOrderActions;
  sessionStore: GuestSessionStore;
  tenantStore: TenantStore;
}): StoreFrontSessionStreamCommands {
  const { cartActions, orderActions, sessionStore, tenantStore } = deps;

  // A pushed snapshot may land after the user has switched stores or the
  // session token has been replaced. Mirror the cart command guards so a stale
  // stream can never clobber the now-active store's state.
  function isScoped(expectedStoreId: string, token: string): boolean {
    if (tenantStore.getState().activeStoreId !== expectedStoreId) return false;
    const session = sessionStore.getState();
    return (
      session.guestToken === token && session.storeId === expectedStoreId
    );
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
            orderActions.orderUpdated(order);
          },
        },
      );

      return () => {
        connection.close();
      };
    },
  };
}
