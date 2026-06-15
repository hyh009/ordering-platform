import type { Order } from '@/models/order';
import { storeFrontOrderService } from '@/services/storeFrontOrder.service';
import {
  mapStoreFrontApiError,
  type StoreFrontCommandFailure,
} from '@/services/utils/storeFrontApiError';
import type { TenantStore } from '../tenant/store';
import type { StoreFrontOrderHistoryActions } from './actions';
import {
  STOREFRONT_ORDER_HISTORY_TTL_MS,
  loadStoreFrontOrderHistory,
  saveStoreFrontOrderHistory,
} from './storage';
import type { StoreFrontOrderHistoryEntry, StoreFrontOrderHistoryItem } from './types';

export type StoreFrontOrderHistoryCommands = {
  hasHistory(storeId: string): boolean;
  findEntry(storeId: string, orderId: string): StoreFrontOrderHistoryEntry | null;
  recordOrder(storeId: string, order: Order, guestToken: string): void;
  removeEntry(storeId: string, orderId: string): void;
  loadOrders(
    storeId: string,
  ): Promise<{ status: 'loaded' } | StoreFrontCommandFailure>;
};

export function createStoreFrontOrderHistoryCommands(deps: {
  actions: StoreFrontOrderHistoryActions;
  tenantStore: TenantStore;
}): StoreFrontOrderHistoryCommands {
  const { actions, tenantStore } = deps;

  function entriesFor(storeId: string) {
    return loadStoreFrontOrderHistory(storeId);
  }

  function updateEntries(storeId: string, entries: StoreFrontOrderHistoryEntry[]) {
    saveStoreFrontOrderHistory(storeId, entries);
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
      const entry: StoreFrontOrderHistoryEntry = {
        storeId,
        orderId: order.id,
        guestToken,
        createdAt: order.createdAt,
        expiresAt: new Date(
          Date.parse(order.createdAt) + STOREFRONT_ORDER_HISTORY_TTL_MS,
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

      const items: StoreFrontOrderHistoryItem[] = [];
      const validEntries: StoreFrontOrderHistoryEntry[] = [];
      let firstFailure: StoreFrontCommandFailure | null = null;

      for (const entry of entries) {
        try {
          const order = await storeFrontOrderService.getOrder(entry.guestToken);
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
          const failure = mapStoreFrontApiError(error);
          if (
            failure.reason !== 'session-expired' &&
            failure.reason !== 'not-found'
          ) {
            validEntries.push(entry);
            firstFailure ??= failure;
          }
        }
      }

      saveStoreFrontOrderHistory(storeId, validEntries);
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
