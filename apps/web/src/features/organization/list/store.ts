import { createStore } from 'zustand/vanilla';
import type {
  OrganizationListItem,
  OrganizationListPage,
  OrganizationReviewStatus,
} from '@/models/organization';

export type OrganizationReviewStatusFilter = OrganizationReviewStatus | 'all';

export type OrganizationListState = {
  error: string | null;
  isLoading: boolean;
  organizations: OrganizationListItem[];
  pagination: OrganizationListPage;
  reviewStatusFilter: OrganizationReviewStatusFilter;
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
    reviewStatusFilter: 'all',
  }));
}
