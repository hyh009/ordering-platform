import type { GuestOrderHistoryStore } from './store';
import type { GuestOrderHistoryEntry, GuestOrderHistoryItem } from './types';

export function createGuestOrderHistoryActions(store: GuestOrderHistoryStore) {
  return {
    entriesUpdated(storeId: string, entries: GuestOrderHistoryEntry[]) {
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

    loadStarted(storeId: string, entries: GuestOrderHistoryEntry[]) {
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
      entries: GuestOrderHistoryEntry[],
      items: GuestOrderHistoryItem[],
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
      entries: GuestOrderHistoryEntry[],
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

export type GuestOrderHistoryActions = ReturnType<
  typeof createGuestOrderHistoryActions
>;
