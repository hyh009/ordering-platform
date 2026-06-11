import type { GuestSessionCommands } from '@/app/global/guestSession/guestSession.commands';
import { loadStoredGuestSession } from '@/app/global/guestSession/guestSession.storage';
import { isOrderFinished } from '@/models/order';
import { guestCartService } from '@/services/guestCart.service';
import {
  mapGuestApiError,
  type GuestCommandFailure,
} from '@/services/utils/guestApiError';
import type { GuestCartActions } from '../cart/actions';
import type { GuestOrderActions } from '../order/actions';

export type RestoreSessionResult =
  /** No session stored for this store; show the clean chooser. */
  | { status: 'none' }
  /** Stored session has ended (abandoned/expired); show the ended notice. */
  | { status: 'ended' }
  | { status: 'cart' }
  | { status: 'order'; finished: boolean }
  | GuestCommandFailure;

export type GuestSessionWorkflowCommands = {
  restoreSession(expectedStoreId: string): Promise<RestoreSessionResult>;
  clearSession(): void;
};

export function createGuestSessionWorkflowCommands(deps: {
  guestSessionCommands: GuestSessionCommands;
  cartActions: GuestCartActions;
  orderActions: GuestOrderActions;
}): GuestSessionWorkflowCommands {
  const { guestSessionCommands, cartActions, orderActions } = deps;

  function clearSession() {
    guestSessionCommands.clearSession();
    cartActions.cartCleared();
    orderActions.orderCleared();
  }

  return {
    clearSession,

    async restoreSession(expectedStoreId) {
      const stored = loadStoredGuestSession();

      if (!stored || stored.storeId !== expectedStoreId) {
        // A session for another store stays untouched; this store starts clean.
        return { status: 'none' };
      }

      guestSessionCommands.startSession(stored);

      try {
        const session = await guestCartService.getSession(stored.guestToken);

        if (session.order) {
          orderActions.orderUpdated(session.order);
          return { status: 'order', finished: isOrderFinished(session.order) };
        }

        if (session.cart && session.cart.status === 'active') {
          cartActions.cartUpdated(session.cart);
          return { status: 'cart' };
        }

        // Abandoned or unusable cart: the session is over.
        clearSession();
        return { status: 'ended' };
      } catch (error) {
        const failure = mapGuestApiError(error);

        if (failure.reason === 'session-expired') {
          clearSession();
          return { status: 'ended' };
        }

        return failure;
      }
    },
  };
}
