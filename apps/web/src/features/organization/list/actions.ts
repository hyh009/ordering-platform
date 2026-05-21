import type {
  Organization,
  OrganizationListPage,
} from '@/models/organization.types';
import type { OrganizationListState } from './store';
import type { StoreApi } from 'zustand/vanilla';

export function createOrganizationListActions(
  store: StoreApi<OrganizationListState>,
) {
  return {
    loadStarted() {
      store.setState({
        error: null,
        isLoading: true,
      });
    },

    loadSucceeded(input: {
      organizations: Organization[];
      pagination: OrganizationListPage;
    }) {
      store.setState({
        error: null,
        isLoading: false,
        organizations: input.organizations,
        pagination: input.pagination,
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

export type OrganizationListActions = ReturnType<
  typeof createOrganizationListActions
>;
