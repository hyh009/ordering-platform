import type { GuestRuntime } from '@/features/guest/runtime';

export function createOrderTrackingPageCommands(runtime: GuestRuntime) {
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
      return {
        ...(await loadActiveOrder(storeId, orderId)),
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
