import type { Organization } from '@/models/organization.types';
import type { OrganizationDetailState } from '@/features/organization/store/organizationDetail.store';
import type { StoreApi } from 'zustand/vanilla';

export function createOrganizationDetailActions(
  store: StoreApi<OrganizationDetailState>,
) {
  return {
    loadStarted() {
      store.setState({
        error: null,
        isLoading: true,
      });
    },

    loadSucceeded(organization: Organization) {
      store.setState({
        error: null,
        isLoading: false,
        organization,
      });
    },

    loadFailed(error: string) {
      store.setState({
        error,
        isLoading: false,
      });
    },

    organizationSaved(organization: Organization) {
      store.setState({
        organization,
      });
    },
  };
}

export type OrganizationDetailActions = ReturnType<
  typeof createOrganizationDetailActions
>;
