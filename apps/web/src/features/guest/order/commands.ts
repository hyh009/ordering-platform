import type { GuestSessionStore } from '@/app/global/guestSession/guestSession.store';
import { guestOrderService } from '@/services/guestOrder.service';
import {
  mapGuestApiError,
  type GuestCommandFailure,
} from '@/services/utils/guestApiError';
import type { GuestOrderActions } from './actions';

export type GuestOrderCommands = {
  loadOrder(): Promise<{ status: 'loaded' } | GuestCommandFailure>;
};

export function createGuestOrderCommands(deps: {
  orderActions: GuestOrderActions;
  sessionStore: GuestSessionStore;
}): GuestOrderCommands {
  const { orderActions, sessionStore } = deps;

  return {
    async loadOrder() {
      const token = sessionStore.getState().guestToken;
      if (!token) {
        return {
          status: 'failed',
          message: '',
          reason: 'session-expired',
        };
      }

      orderActions.loadStarted();

      try {
        const order = await guestOrderService.getOrder(token);

        orderActions.orderUpdated(order);
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapGuestApiError(error);

        orderActions.loadFailed(failure.message);
        return failure;
      }
    },
  };
}
