import type { GuestSessionCommands } from '@/app/global/guestSession/guestSession.commands';
import type { StoredGuestSession } from '@/app/global/guestSession/guestSession.storage';
import type { GuestSessionStore } from '@/app/global/guestSession/guestSession.store';
import { canGuestAddOn } from '@/models/order';
import { storeFrontCartService } from '@/services/storeFrontCart.service';
import {
  mapStoreFrontApiError,
  type StoreFrontCommandFailure,
} from '@/services/utils/storeFrontApiError';
import type { StoreFrontCartActions } from '../cart/actions';
import type { StoreFrontOrderActions } from '../order/actions';
import type { TenantStore } from '../tenant/store';

export type ResumeSessionResult =
  /** No session stored for this store; show the clean chooser. */
  | { status: 'none' }
  /** Stored session has ended (abandoned/expired); show the ended notice. */
  | { status: 'ended' }
  /** Active cart restored into the cart store; resume into the menu/cart flow. */
  | { status: 'cart' }
  /**
   * Submitted order restored into the order store; resume into order tracking.
   * `canAddOn` says whether guests may still add to it (pay-later, unpaid, not
   * finished); `orderId` is for navigation.
   */
  | { status: 'order'; canAddOn: boolean; orderId: string }
  | StoreFrontCommandFailure;

export type StoreFrontSessionWorkflowCommands = {
  hasStoredSession(storeId: string): boolean;
  restoreSession(
    storeId: string,
  ): Promise<
    { status: 'none' } | { status: 'restored'; session: StoredGuestSession }
  >;
  resumeSession(expectedStoreId: string): Promise<ResumeSessionResult>;
  clearSession(storeId: string): void;
};

export function createStoreFrontSessionWorkflowCommands(deps: {
  guestSessionCommands: GuestSessionCommands;
  cartActions: StoreFrontCartActions;
  orderActions: StoreFrontOrderActions;
  sessionStore: GuestSessionStore;
  tenantStore: TenantStore;
}): StoreFrontSessionWorkflowCommands {
  const {
    guestSessionCommands,
    cartActions,
    orderActions,
    sessionStore,
    tenantStore,
  } = deps;
  const restores = new Map<
    string,
    Promise<
      { status: 'none' } | { status: 'restored'; session: StoredGuestSession }
    >
  >();

  function clearSession(storeId: string) {
    guestSessionCommands.clearSession(storeId);
    if (tenantStore.getState().activeStoreId === storeId) {
      cartActions.cartCleared();
      orderActions.orderCleared();
    }
  }

  function restoreSession(storeId: string) {
    const existing = restores.get(storeId);
    if (existing) return existing;

    const restore = Promise.resolve().then(() => {
      if (tenantStore.getState().activeStoreId !== storeId) {
        return { status: 'none' as const };
      }

      const session = guestSessionCommands.restoreStoredSession(storeId);
      return session
        ? { status: 'restored' as const, session }
        : { status: 'none' as const };
    });
    restores.set(storeId, restore);
    void restore.finally(() => restores.delete(storeId));
    return restore;
  }

  function isCurrentSession(storeId: string, guestToken: string): boolean {
    const current = sessionStore.getState();
    return (
      tenantStore.getState().activeStoreId === storeId &&
      current.storeId === storeId &&
      current.guestToken === guestToken
    );
  }

  return {
    hasStoredSession: guestSessionCommands.hasStoredSession,
    clearSession,
    restoreSession,

    async resumeSession(expectedStoreId) {
      const restored = await restoreSession(expectedStoreId);
      if (restored.status === 'none') return { status: 'none' };
      try {
        const session = await storeFrontCartService.getSession(
          restored.session.guestToken,
        );
        if (!isCurrentSession(expectedStoreId, restored.session.guestToken)) {
          return {
            status: 'failed',
            message: '',
            reason: 'session-store-mismatch',
          };
        }

        // The session may now carry BOTH a live draft cart and an order at the
        // same time (reusable-cart model). Hydrate every store the session
        // provides so the resumed flow has the full live state.
        if (session.cart && session.cart.status === 'active') {
          cartActions.cartUpdated(session.cart);
        }

        if (session.order) {
          orderActions.orderUpdated(session.order);
          // TODO(phase4): when both a draft cart and an order are present, decide
          // whether to resume into order tracking or the add-on draft flow. For
          // now preserve current behavior and resume into order tracking.
          return {
            status: 'order',
            canAddOn: canGuestAddOn(session.order),
            orderId: session.order.id,
          };
        }

        if (session.cart && session.cart.status === 'active') {
          return { status: 'cart' };
        }

        // Abandoned or unusable cart: the session is over.
        clearSession(expectedStoreId);
        return { status: 'ended' };
      } catch (error) {
        const failure = mapStoreFrontApiError(error);

        if (failure.reason === 'session-expired') {
          if (!isCurrentSession(expectedStoreId, restored.session.guestToken)) {
            return {
              status: 'failed',
              message: '',
              reason: 'session-store-mismatch',
            };
          }
          clearSession(expectedStoreId);
          return { status: 'ended' };
        }

        return failure;
      }
    },
  };
}
