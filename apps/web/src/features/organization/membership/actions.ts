import type {
  OrganizationMembership,
  OrganizationMembershipListPage,
} from '@/models/organizationMembership';
import type { StoreApi } from 'zustand/vanilla';
import type { OrganizationMembershipListState } from './store';

export function createOrganizationMembershipListActions(
  store: StoreApi<OrganizationMembershipListState>,
) {
  return {
    loadStarted() {
      store.setState({ error: null, isLoading: true });
    },

    loadSucceeded(input: {
      memberships: OrganizationMembership[];
      pagination: OrganizationMembershipListPage;
    }) {
      store.setState({
        error: null,
        isLoading: false,
        memberships: input.memberships,
        pagination: input.pagination,
      });
    },

    loadFailed(error: string) {
      store.setState({ error, isLoading: false });
    },

    memberAdded(membership: OrganizationMembership) {
      store.setState((state) => ({
        memberships: [...state.memberships, membership],
        pagination: {
          ...state.pagination,
          total: state.pagination.total + 1,
        },
      }));
    },

    membershipSaved(membership: OrganizationMembership) {
      store.setState((state) => ({
        memberships: state.memberships.map((m) =>
          m.id === membership.id ? membership : m,
        ),
      }));
    },
  };
}

export type OrganizationMembershipListActions = ReturnType<
  typeof createOrganizationMembershipListActions
>;
