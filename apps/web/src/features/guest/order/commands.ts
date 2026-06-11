import type { GuestSessionStore } from '@/app/global/guestSession/guestSession.store';
import { tDefault } from '@/app/i18n';
import { guestOrderService } from '@/services/guestOrder.service';
import {
  mapGuestApiError,
  type GuestCommandFailure,
} from '@/services/utils/guestApiError';
import type { GuestOrderActions } from './actions';
import type { GuestTenantStore } from '../tenant/store';

export type GuestOrderCommands = {
  loadOrder(
    expectedStoreId: string,
    expectedOrderId: string,
  ): Promise<{ status: 'loaded' } | GuestCommandFailure>;
};

export function createGuestOrderCommands(deps: {
  orderActions: GuestOrderActions;
  sessionStore: GuestSessionStore;
  tenantStore: GuestTenantStore;
}): GuestOrderCommands {
  const { orderActions, sessionStore, tenantStore } = deps;

  return {
    async loadOrder(expectedStoreId, expectedOrderId) {
      const session = sessionStore.getState();
      const token = session.guestToken;
      if (!token) {
        return {
          status: 'failed',
          message: '',
          reason: 'session-expired',
        };
      }
      if (
        session.storeId !== expectedStoreId ||
        tenantStore.getState().activeStoreId !== expectedStoreId
      ) {
        return {
          status: 'failed',
          message: '',
          reason: 'session-store-mismatch',
        };
      }

      orderActions.loadStarted();

      try {
        const order = await guestOrderService.getOrder(token);
        const currentSession = sessionStore.getState();
        if (
          currentSession.storeId !== expectedStoreId ||
          currentSession.guestToken !== token ||
          tenantStore.getState().activeStoreId !== expectedStoreId
        ) {
          return {
            status: 'failed',
            message: '',
            reason: 'session-store-mismatch',
          };
        }
        if (order.id !== expectedOrderId) {
          return {
            status: 'failed',
            message: tDefault(
              'guest.errors.orderNotFound',
              'This order was not found.',
            ),
            reason: 'not-found',
          };
        }

        orderActions.orderUpdated(order);
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapGuestApiError(error);

        const currentSession = sessionStore.getState();
        if (
          currentSession.storeId === expectedStoreId &&
          currentSession.guestToken === token &&
          tenantStore.getState().activeStoreId === expectedStoreId
        ) {
          orderActions.loadFailed(failure.message);
        }
        return failure;
      }
    },
  };
}
