import { createStore } from 'zustand/vanilla';
import type {
  OrganizationListItem,
  OrganizationListPage,
  OrganizationListSort,
  OrganizationReviewStatus,
  OrganizationStatus,
} from '@/models/organization';

export type OrganizationReviewStatusFilter = OrganizationReviewStatus | 'all';
export type OrganizationStatusFilter = OrganizationStatus | 'all';

export const DEFAULT_ORGANIZATION_LIST_SORT: OrganizationListSort = {
  sortBy: 'createdAt',
  sortDirection: 'desc',
};

export type OrganizationListState = {
  error: string | null;
  isLoading: boolean;
  organizations: OrganizationListItem[];
  pagination: OrganizationListPage;
  keyword: string;
  reviewStatusFilter: OrganizationReviewStatusFilter;
  statusFilter: OrganizationStatusFilter;
  sort: OrganizationListSort;
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
    keyword: '',
    reviewStatusFilter: 'all',
    statusFilter: 'all',
    sort: DEFAULT_ORGANIZATION_LIST_SORT,
  }));
}
