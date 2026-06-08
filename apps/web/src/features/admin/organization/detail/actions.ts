import type { Organization } from '@/models/organization';
import type { OrganizationMembership } from '@/models/organizationMembership';
import type { StoreListItem } from '@/models/store';
import type { OrganizationDetailState } from './store';
import type { StoreApi } from 'zustand/vanilla';

export function createOrganizationDetailActions(
  store: StoreApi<OrganizationDetailState>,
) {
  return {
    loadStarted() {
      store.setState({ error: null, isLoading: true });
    },

    loadSucceeded(organization: Organization) {
      store.setState({ error: null, isLoading: false, organization });
    },

    loadFailed(error: string) {
      store.setState({ error, isLoading: false });
    },

    storesLoadStarted() {
      store.setState({ storesLoading: true, storesError: null });
    },

    storesLoadSucceeded(stores: StoreListItem[]) {
      store.setState({ storesLoading: false, stores });
    },

    storesLoadFailed(error: string) {
      store.setState({ storesLoading: false, storesError: error });
    },

    ownerLoadStarted() {
      store.setState({ ownerLoading: true });
    },

    ownerLoadSucceeded(owner: OrganizationMembership | null) {
      store.setState({ ownerLoading: false, owner });
    },

    ownerLoadFailed() {
      store.setState({ ownerLoading: false });
    },
  };
}

export type OrganizationDetailActions = ReturnType<
  typeof createOrganizationDetailActions
>;
