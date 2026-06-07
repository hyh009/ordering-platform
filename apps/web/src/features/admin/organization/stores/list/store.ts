import { createStore } from 'zustand/vanilla';
import type { StoreListItem, StoreListPage } from '@/models/store';

export type OrganizationStoreListState = {
  stores: StoreListItem[];
  isLoading: boolean;
  error: string | null;
  pagination: StoreListPage;
};

export function createOrganizationStoreListStore() {
  return createStore<OrganizationStoreListState>(() => ({
    stores: [],
    isLoading: false,
    error: null,
    pagination: {
      limit: 20,
      offset: 0,
      total: 0,
    },
  }));
}
