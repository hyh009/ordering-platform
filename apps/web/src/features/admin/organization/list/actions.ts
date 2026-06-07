import type {
  OrganizationListItem,
  OrganizationListPage,
  OrganizationListSort,
} from '@/models/organization';
import type {
  OrganizationListState,
  OrganizationReviewStatusFilter,
  OrganizationStatusFilter,
} from './store';
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

    statusFilterChanged(statusFilter: OrganizationStatusFilter) {
      store.setState({ statusFilter });
    },

    keywordChanged(keyword: string) {
      store.setState({ keyword });
    },

    sortChanged(sort: OrganizationListSort) {
      store.setState({ sort });
    },
  };
}

export type OrganizationListActions = ReturnType<
  typeof createOrganizationListActions
>;
