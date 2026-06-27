import type { GuestSessionStore } from '@/app/global/guestSession/guestSession.store';
import { tDefault } from '@/app/i18n';
import type { Order } from '@/models/order';
import { storeFrontOrderService } from '@/services/storeFrontOrder.service';
import {
  mapStoreFrontApiError,
  type StoreFrontCommandFailure,
} from '@/services/utils/storeFrontApiError';
import type { StoreFrontOrderActions } from './actions';
import type { TenantStore } from '../tenant/store';

export type StoreFrontOrderCommands = {
  /**
   * Loads the order owned by the active guest session into the shared order
   * store (SSE then keeps it live). Returns a typed failure WITHOUT writing
   * the store — the page VM routes failures through
   * `handleStorefrontLoadFailure` and writes the store itself via
   * `reportActiveLoadFailure`.
   */
  loadOrder(
    expectedStoreId: string,
    expectedOrderId: string,
  ): Promise<{ status: 'loaded' } | StoreFrontCommandFailure>;
  /**
   * Fetches an order by its stored guest token WITHOUT writing any store.
   * Used for history-order viewing (different session's token). Returns the
   * order on success so the page VM can hold it in page-local state.
   */
  fetchOrderWithToken(
    expectedStoreId: string,
    expectedOrderId: string,
    guestToken: string,
  ): Promise<{ status: 'loaded'; order: Order } | StoreFrontCommandFailure>;
  /**
   * Records a primary-load failure into the shared order store so the page
   * can render its load-error view. Used by `reportActiveLoadFailure` in the
   * page command when the VM's `onPageError` fires for the active path.
   */
  reportLoadFailure(message: string): void;
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
        return mapStoreFrontApiError(error);
      }
    },

    reportLoadFailure(message: string) {
      orderActions.loadFailed(message);
    },

    async fetchOrderWithToken(expectedStoreId, expectedOrderId, guestToken) {
      if (tenantStore.getState().activeStoreId !== expectedStoreId) {
        return {
          status: 'failed',
          message: '',
          reason: 'session-store-mismatch',
        };
      }

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
          return {
            status: 'failed',
            message: tDefault(
              'guest.errors.orderNotFound',
              'This order was not found.',
            ),
            reason: 'not-found',
          };
        }
        return { status: 'loaded', order };
      } catch (error) {
        return mapStoreFrontApiError(error);
      }
    },
  };
}
