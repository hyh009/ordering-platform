import type { StoreFrontRuntime } from '@/features/storeFront/runtime';

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
    async initialize(storeId: string, orderId: string) {
      await runtime.commands.tenant.activateStore(storeId);
      const historyEntry = runtime.commands.orderHistory.findEntry(
        storeId,
        orderId,
      );
      let invalidHistoryEntry = false;
      if (historyEntry) {
        const historyResult = await runtime.commands.order.loadOrderWithToken(
          storeId,
          orderId,
          historyEntry.guestToken,
        );
        if (
          historyResult.status === 'failed' &&
          (historyResult.reason === 'session-expired' ||
            historyResult.reason === 'not-found')
        ) {
          runtime.commands.orderHistory.removeEntry(storeId, orderId);
          invalidHistoryEntry = true;
        } else {
          const activeSession = runtime.stores.session.getState();
          const access =
            activeSession.storeId === storeId &&
            activeSession.guestToken === historyEntry.guestToken
              ? ('active' as const)
              : ('history' as const);
          return { ...historyResult, access };
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
      return {
        ...result,
        access: 'active' as const,
      };
    },

    async refresh(
      storeId: string,
      orderId: string,
      access: 'active' | 'history',
    ) {
      if (access === 'history') {
        const entry = runtime.commands.orderHistory.findEntry(storeId, orderId);
        if (!entry) return { status: 'none' as const };
        const result = await runtime.commands.order.loadOrderWithToken(
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
  };
}
