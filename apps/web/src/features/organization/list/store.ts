import { createStore } from 'zustand/vanilla';
import type {
  OrganizationListItem,
  OrganizationListPage,
} from '@/models/organization';

export type OrganizationListState = {
  error: string | null;
  isLoading: boolean;
  organizations: OrganizationListItem[];
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
