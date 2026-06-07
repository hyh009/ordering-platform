import type { StoreApi } from 'zustand/vanilla';
import type { StoreListItem, StoreListPage } from '@/models/store';
import type { OrganizationStoreListState } from './store';

export function createOrganizationStoreListActions(
  store: StoreApi<OrganizationStoreListState>,
) {
  return {
    loadStarted() {
      store.setState({ error: null, isLoading: true });
    },

    loadSucceeded(input: {
      stores: StoreListItem[];
      pagination: StoreListPage;
    }) {
      store.setState({
        error: null,
        isLoading: false,
        stores: input.stores,
        pagination: input.pagination,
      });
    },

    loadFailed(error: string) {
      store.setState({ error, isLoading: false });
    },
  };
}

export type OrganizationStoreListActions = ReturnType<
  typeof createOrganizationStoreListActions
>;
