import type { Order } from '@/models/order';
import type { StoreFrontRuntime } from '@/features/storeFront/runtime';
import type { StoreFrontCommandFailure } from '@/services/utils/storeFrontApiError';

export type OrderTrackingInitResult =
  | { status: 'loaded'; access: 'active' }
  | { status: 'loaded'; access: 'history'; order: Order }
  | (StoreFrontCommandFailure & { access: 'active' | 'history' })
  | { status: 'none'; target: 'history' | 'landing' };

export type OrderTrackingRefreshResult =
  | { status: 'loaded'; order: Order }
  | { status: 'loaded' }
  | StoreFrontCommandFailure
  | { status: 'none' };

export function createOrderTrackingPageCommands(runtime: StoreFrontRuntime) {
  async function loadActiveOrder(storeId: string, orderId: string) {
    const result = await runtime.commands.order.loadOrder(storeId, orderId);
    if (
      result.status === 'failed' &&
      (result.reason === 'session-expired' ||
        result.reason === 'session-store-mismatch')
    ) {
      runtime.commands.session.clearSession(storeId);
      return { status: 'none' as const };
    }
    return result;
  }

  return {
    async initialize(
      storeId: string,
      orderId: string,
    ): Promise<OrderTrackingInitResult> {
      await runtime.commands.tenant.activateStore(storeId);
      const historyEntry = runtime.commands.orderHistory.findEntry(
        storeId,
        orderId,
      );
      let invalidHistoryEntry = false;
      if (historyEntry) {
        const activeSession = runtime.stores.session.getState();
        const isOwnActiveSession =
          activeSession.storeId === storeId &&
          activeSession.guestToken === historyEntry.guestToken;

        if (isOwnActiveSession) {
          // The history entry's token matches the live session — treat as active.
          const result = await loadActiveOrder(storeId, orderId);
          if (result.status === 'loaded') {
            const loadedOrder = runtime.stores.order.getState().order;
            const guestToken = runtime.stores.session.getState().guestToken;
            if (loadedOrder?.id === orderId && guestToken) {
              runtime.commands.orderHistory.recordOrder(
                storeId,
                loadedOrder,
                guestToken,
              );
            }
          }
          if (result.status === 'none') {
            return { status: 'none', target: 'landing' };
          }
          return { ...result, access: 'active' };
        }

        // Foreign/past order: fetch without writing the shared store.
        const historyResult = await runtime.commands.order.fetchOrderWithToken(
          storeId,
          orderId,
          historyEntry.guestToken,
        );
        if (
          historyResult.status === 'failed' &&
          (historyResult.reason === 'session-expired' ||
            historyResult.reason === 'not-found')
        ) {
          // Expired or gone: remove and fall through to active-session path.
          runtime.commands.orderHistory.removeEntry(storeId, orderId);
          invalidHistoryEntry = true;
        } else if (historyResult.status === 'loaded') {
          return {
            status: 'loaded',
            access: 'history',
            order: historyResult.order,
          };
        } else {
          // Transient failure (network/server): surface it as history failure.
          return { ...historyResult, access: 'history' };
        }
      }

      const session = await runtime.commands.session.restoreSession(storeId);
      if (session.status === 'none') {
        return {
          status: 'none' as const,
          target: invalidHistoryEntry
            ? ('history' as const)
            : ('landing' as const),
        };
      }
      const result = await loadActiveOrder(storeId, orderId);
      if (result.status === 'loaded') {
        // The participant's own browser just observed their order via its active
        // session. Record it into this device's local history so they can find
        // it later from "View recent orders" even if they never pressed submit
        // or joined a submitted order. This is the single chokepoint covering
        // both resume-from-landing (which navigates here) and direct open;
        // recordOrder dedups, so repeat visits are safe.
        const loadedOrder = runtime.stores.order.getState().order;
        const guestToken = runtime.stores.session.getState().guestToken;
        if (loadedOrder?.id === orderId && guestToken) {
          runtime.commands.orderHistory.recordOrder(
            storeId,
            loadedOrder,
            guestToken,
          );
        }
      }
      if (result.status === 'none') {
        return { status: 'none', target: 'landing' };
      }
      return {
        ...result,
        access: 'active' as const,
      };
    },

    async refresh(
      storeId: string,
      orderId: string,
      access: 'active' | 'history',
    ): Promise<OrderTrackingRefreshResult> {
      if (access === 'history') {
        const entry = runtime.commands.orderHistory.findEntry(storeId, orderId);
        if (!entry) return { status: 'none' as const };
        const result = await runtime.commands.order.fetchOrderWithToken(
          storeId,
          orderId,
          entry.guestToken,
        );
        if (
          result.status === 'failed' &&
          (result.reason === 'session-expired' || result.reason === 'not-found')
        ) {
          runtime.commands.orderHistory.removeEntry(storeId, orderId);
          return { status: 'none' as const };
        }
        return result;
      }
      return loadActiveOrder(storeId, orderId);
    },

    leave(storeId: string) {
      runtime.commands.session.clearSession(storeId);
    },

    // Record a primary-load failure into the active order store so the page
    // renders its load-error view (mirrors cart's reportLoadFailure).
    reportActiveLoadFailure(message: string) {
      runtime.commands.order.reportLoadFailure(message);
    },
  };
}
