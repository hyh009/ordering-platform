import type { GuestRuntime } from '@/features/guest/runtime';

export function createOrderTrackingPageCommands(runtime: GuestRuntime) {
  async function loadRouteOrder(storeId: string, orderId: string) {
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
      const session = await runtime.commands.session.restoreSession(storeId);
      if (session.status === 'none') return session;
      return loadRouteOrder(storeId, orderId);
    },

    refresh(storeId: string, orderId: string) {
      return loadRouteOrder(storeId, orderId);
    },

    leave(storeId: string) {
      runtime.commands.session.clearSession(storeId);
    },
  };
}
