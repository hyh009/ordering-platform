import type { Order } from '@/models/order';
import type { OrderDetailStore } from './store';

export function createOrderDetailActions(store: OrderDetailStore) {
  return {
    loadStarted() {
      store.setState({ isLoading: true, error: null });
    },

    loadSucceeded(order: Order) {
      store.setState({ order, isLoading: false, lastLoadedAt: Date.now() });
    },

    loadFailed(error: string) {
      store.setState({ isLoading: false, error });
    },

    orderUpdated(order: Order) {
      store.setState({ order, lastLoadedAt: Date.now() });
    },
  };
}

export type OrderDetailActions = ReturnType<typeof createOrderDetailActions>;
