import { createStore } from 'zustand/vanilla';
import type {
  OrganizationMembership,
  OrganizationMembershipListPage,
} from '@/models/organizationMembership';

export type OrganizationMembershipListState = {
  error: string | null;
  isLoading: boolean;
  memberships: OrganizationMembership[];
  pagination: OrganizationMembershipListPage;
};

export function createOrganizationMembershipListStore() {
  return createStore<OrganizationMembershipListState>(() => ({
    error: null,
    isLoading: false,
    memberships: [],
    pagination: {
      limit: 20,
      offset: 0,
      total: 0,
    },
  }));
}
