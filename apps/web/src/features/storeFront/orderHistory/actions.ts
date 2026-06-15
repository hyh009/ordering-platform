import type { StoreFrontOrderHistoryStore } from './store';
import type { StoreFrontOrderHistoryEntry, StoreFrontOrderHistoryItem } from './types';

export function createStoreFrontOrderHistoryActions(store: StoreFrontOrderHistoryStore) {
  return {
    entriesUpdated(storeId: string, entries: StoreFrontOrderHistoryEntry[]) {
      const orderIds = new Set(entries.map((entry) => entry.orderId));
      store.setState((state) => ({
        storeId,
        entries,
        items:
          state.storeId === storeId
            ? state.items.filter((item) => orderIds.has(item.order.id))
            : [],
      }));
    },

    loadStarted(storeId: string, entries: StoreFrontOrderHistoryEntry[]) {
      store.setState({
        storeId,
        entries,
        items: [],
        error: null,
        isLoading: true,
      });
    },

    loadSucceeded(
      storeId: string,
      entries: StoreFrontOrderHistoryEntry[],
      items: StoreFrontOrderHistoryItem[],
    ) {
      store.setState({
        storeId,
        entries,
        items,
        error: null,
        isLoading: false,
      });
    },

    loadFailed(
      storeId: string,
      entries: StoreFrontOrderHistoryEntry[],
      error: string,
    ) {
      store.setState({ storeId, entries, error, isLoading: false });
    },

    cleared() {
      store.setState({
        storeId: null,
        entries: [],
        items: [],
        error: null,
        isLoading: false,
      });
    },
  };
}

export type StoreFrontOrderHistoryActions = ReturnType<
  typeof createStoreFrontOrderHistoryActions
>;
