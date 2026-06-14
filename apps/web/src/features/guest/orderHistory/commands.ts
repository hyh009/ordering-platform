import type { Order } from '@/models/order';
import { guestOrderService } from '@/services/guestOrder.service';
import {
  mapGuestApiError,
  type GuestCommandFailure,
} from '@/services/utils/guestApiError';
import type { GuestTenantStore } from '../tenant/store';
import type { GuestOrderHistoryActions } from './actions';
import {
  GUEST_ORDER_HISTORY_TTL_MS,
  loadGuestOrderHistory,
  saveGuestOrderHistory,
} from './storage';
import type { GuestOrderHistoryEntry, GuestOrderHistoryItem } from './types';

export type GuestOrderHistoryCommands = {
  hasHistory(storeId: string): boolean;
  findEntry(storeId: string, orderId: string): GuestOrderHistoryEntry | null;
  recordOrder(storeId: string, order: Order, guestToken: string): void;
  removeEntry(storeId: string, orderId: string): void;
  loadOrders(
    storeId: string,
  ): Promise<{ status: 'loaded' } | GuestCommandFailure>;
};

export function createGuestOrderHistoryCommands(deps: {
  actions: GuestOrderHistoryActions;
  tenantStore: GuestTenantStore;
}): GuestOrderHistoryCommands {
  const { actions, tenantStore } = deps;

  function entriesFor(storeId: string) {
    return loadGuestOrderHistory(storeId);
  }

  function updateEntries(storeId: string, entries: GuestOrderHistoryEntry[]) {
    saveGuestOrderHistory(storeId, entries);
    if (tenantStore.getState().activeStoreId === storeId) {
      actions.entriesUpdated(storeId, entries);
    }
  }

  return {
    hasHistory(storeId) {
      return entriesFor(storeId).length > 0;
    },

    findEntry(storeId, orderId) {
      return (
        entriesFor(storeId).find((entry) => entry.orderId === orderId) ?? null
      );
    },

    recordOrder(storeId, order, guestToken) {
      if (
        tenantStore.getState().activeStoreId !== storeId ||
        order.storeId !== storeId
      ) {
        return;
      }
      const entry: GuestOrderHistoryEntry = {
        storeId,
        orderId: order.id,
        guestToken,
        createdAt: order.createdAt,
        expiresAt: new Date(
          Date.parse(order.createdAt) + GUEST_ORDER_HISTORY_TTL_MS,
        ).toISOString(),
      };
      updateEntries(storeId, [
        entry,
        ...entriesFor(storeId).filter((item) => item.orderId !== order.id),
      ]);
    },

    removeEntry(storeId, orderId) {
      updateEntries(
        storeId,
        entriesFor(storeId).filter((entry) => entry.orderId !== orderId),
      );
    },

    async loadOrders(storeId) {
      const entries = entriesFor(storeId);
      if (tenantStore.getState().activeStoreId !== storeId) {
        return {
          status: 'failed',
          message: '',
          reason: 'session-store-mismatch',
        };
      }
      actions.loadStarted(storeId, entries);

      const items: GuestOrderHistoryItem[] = [];
      const validEntries: GuestOrderHistoryEntry[] = [];
      let firstFailure: GuestCommandFailure | null = null;

      for (const entry of entries) {
        try {
          const order = await guestOrderService.getOrder(entry.guestToken);
          if (tenantStore.getState().activeStoreId !== storeId) {
            return {
              status: 'failed',
              message: '',
              reason: 'session-store-mismatch',
            };
          }
          if (order.id !== entry.orderId || order.storeId !== storeId) continue;
          validEntries.push(entry);
          items.push({ entry, order });
        } catch (error) {
          const failure = mapGuestApiError(error);
          if (
            failure.reason !== 'session-expired' &&
            failure.reason !== 'not-found'
          ) {
            validEntries.push(entry);
            firstFailure ??= failure;
          }
        }
      }

      saveGuestOrderHistory(storeId, validEntries);
      if (tenantStore.getState().activeStoreId !== storeId) {
        return {
          status: 'failed',
          message: '',
          reason: 'session-store-mismatch',
        };
      }
      if (firstFailure && items.length === 0) {
        actions.loadFailed(storeId, validEntries, firstFailure.message);
        return firstFailure;
      }
      actions.loadSucceeded(storeId, validEntries, items);
      return { status: 'loaded' };
    },
  };
}
