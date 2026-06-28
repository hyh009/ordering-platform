import type { OrderSummary } from '@/models/order';
import type { OrderListStore } from './store';

export function createOrderListActions(store: OrderListStore) {
  return {
    loadStarted() {
      store.setState({
        error: null,
        isLoading: true,
      });
    },

    loadSucceeded(result: {
      orders: OrderSummary[];
      total: number;
      page: number;
      pageSize: number;
    }) {
      store.setState({
        orders: result.orders,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        error: null,
        isLoading: false,
      });
    },

    loadFailed(error: string) {
      store.setState({
        error,
        isLoading: false,
      });
    },
  };
}

export type OrderListActions = ReturnType<typeof createOrderListActions>;
