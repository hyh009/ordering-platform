import type {
  OrganizationListItem,
  OrganizationListPage,
} from '@/models/organization';
import type { OrganizationListState, OrganizationReviewStatusFilter } from './store';
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
      organizations: OrganizationListItem[];
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

    filterChanged(reviewStatusFilter: OrganizationReviewStatusFilter) {
      store.setState({ reviewStatusFilter });
    },
  };
}

export type OrganizationListActions = ReturnType<
  typeof createOrganizationListActions
>;
