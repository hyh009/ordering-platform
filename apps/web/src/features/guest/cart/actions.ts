import type { Cart } from '@/models/cart';
import type { GuestCartStore } from './store';

export function createGuestCartActions(store: GuestCartStore) {
  return {
    loadStarted() {
      store.setState({ error: null, isLoading: true });
    },

    loadFailed(error: string) {
      store.setState({ error, isLoading: false });
    },

    mutateStarted() {
      store.setState({ error: null, isMutating: true });
    },

    mutateFailed(error: string) {
      store.setState({ error, isMutating: false });
    },

    cartUpdated(cart: Cart) {
      store.setState({
        cart,
        error: null,
        isLoading: false,
        isMutating: false,
      });
    },

    cartCleared() {
      store.setState({
        cart: null,
        error: null,
        isLoading: false,
        isMutating: false,
      });
    },
  };
}

export type GuestCartActions = ReturnType<typeof createGuestCartActions>;
