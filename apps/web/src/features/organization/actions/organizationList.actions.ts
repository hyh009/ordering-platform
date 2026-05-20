import type {
  Organization,
  OrganizationListPage,
} from '@/models/organization.types';
import type { OrganizationListState } from '@/features/organization/store/organizationList.store';
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

    organizationSaved(organization: Organization) {
      store.setState((state) => {
        const exists = state.organizations.some(
          (item) => item.id === organization.id,
        );

        return {
          organizations: exists
            ? state.organizations.map((item) =>
                item.id === organization.id ? organization : item,
              )
            : [organization, ...state.organizations],
        };
      });
    },
  };
}

export type OrganizationListActions = ReturnType<
  typeof createOrganizationListActions
>;
