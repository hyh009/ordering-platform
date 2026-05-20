import { createStore } from 'zustand/vanilla';
import type {
  Organization,
  OrganizationListPage,
} from '@/models/organization.types';

export type OrganizationListState = {
  error: string | null;
  isLoading: boolean;
  organizations: Organization[];
  pagination: OrganizationListPage;
};

export function createOrganizationListStore() {
  return createStore<OrganizationListState>(() => ({
    error: null,
    isLoading: false,
    organizations: [],
    pagination: {
      limit: 20,
      offset: 0,
      total: 0,
    },
  }));
}
