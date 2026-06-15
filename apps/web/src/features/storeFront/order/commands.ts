import type { GuestSessionStore } from '@/app/global/guestSession/guestSession.store';
import { tDefault } from '@/app/i18n';
import { storeFrontOrderService } from '@/services/storeFrontOrder.service';
import {
  mapStoreFrontApiError,
  type StoreFrontCommandFailure,
} from '@/services/utils/storeFrontApiError';
import type { StoreFrontOrderActions } from './actions';
import type { TenantStore } from '../tenant/store';

export type StoreFrontOrderCommands = {
  loadOrder(
    expectedStoreId: string,
    expectedOrderId: string,
  ): Promise<{ status: 'loaded' } | StoreFrontCommandFailure>;
  loadOrderWithToken(
    expectedStoreId: string,
    expectedOrderId: string,
    guestToken: string,
  ): Promise<{ status: 'loaded' } | StoreFrontCommandFailure>;
};

export function createStoreFrontOrderCommands(deps: {
  orderActions: StoreFrontOrderActions;
  sessionStore: GuestSessionStore;
  tenantStore: TenantStore;
}): StoreFrontOrderCommands {
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
        const order = await storeFrontOrderService.getOrder(token);
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
        if (order.id !== expectedOrderId || order.storeId !== expectedStoreId) {
          const failure: StoreFrontCommandFailure = {
            status: 'failed',
            message: tDefault(
              'guest.errors.orderNotFound',
              'This order was not found.',
            ),
            reason: 'not-found',
          };
          orderActions.loadFailed(failure.message);
          return failure;
        }

        orderActions.orderUpdated(order);
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapStoreFrontApiError(error);

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

    async loadOrderWithToken(expectedStoreId, expectedOrderId, guestToken) {
      if (tenantStore.getState().activeStoreId !== expectedStoreId) {
        return {
          status: 'failed',
          message: '',
          reason: 'session-store-mismatch',
        };
      }

      orderActions.loadStarted();
      try {
        const order = await storeFrontOrderService.getOrder(guestToken);
        if (tenantStore.getState().activeStoreId !== expectedStoreId) {
          return {
            status: 'failed',
            message: '',
            reason: 'session-store-mismatch',
          };
        }
        if (order.id !== expectedOrderId || order.storeId !== expectedStoreId) {
          const failure: StoreFrontCommandFailure = {
            status: 'failed',
            message: tDefault(
              'guest.errors.orderNotFound',
              'This order was not found.',
            ),
            reason: 'not-found',
          };
          orderActions.loadFailed(failure.message);
          return failure;
        }
        orderActions.orderUpdated(order);
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapStoreFrontApiError(error);
        if (tenantStore.getState().activeStoreId === expectedStoreId) {
          orderActions.loadFailed(failure.message);
        }
        return failure;
      }
    },
  };
}
