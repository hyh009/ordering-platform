import type { Order } from '@/models/order';
import type { StoreFrontOrderStore } from './store';

export function createStoreFrontOrderActions(store: StoreFrontOrderStore) {
  return {
    loadStarted() {
      store.setState({ error: null, isLoading: true });
    },

    loadFailed(error: string) {
      store.setState({ error, isLoading: false });
    },

    orderUpdated(order: Order) {
      store.setState({ order, error: null, isLoading: false });
    },

    orderCleared() {
      store.setState({ order: null, error: null, isLoading: false });
    },
  };
}

export type StoreFrontOrderActions = ReturnType<typeof createStoreFrontOrderActions>;
