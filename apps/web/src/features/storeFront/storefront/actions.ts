import type { PublicMenu, PublicStore } from '@/models/storeFrontMenu';
import type { StorefrontStore } from './store';

export function createStorefrontActions(store: StorefrontStore) {
  return {
    loadStarted() {
      store.setState({ error: null, isLoading: true });
    },

    loadSucceeded(input: { store: PublicStore; menu: PublicMenu }) {
      store.setState({
        store: input.store,
        menu: input.menu,
        error: null,
        isLoading: false,
      });
    },

    storeLoaded(loadedStore: PublicStore) {
      store.setState({
        store: loadedStore,
        error: null,
        isLoading: false,
      });
    },

    loadFailed(error: string) {
      store.setState({ error, isLoading: false });
    },

    storefrontCleared() {
      store.setState({
        store: null,
        menu: null,
        error: null,
        isLoading: false,
      });
    },
  };
}

export type StorefrontActions = ReturnType<
  typeof createStorefrontActions
>;
