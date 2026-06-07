import { createStore } from 'zustand/vanilla';
import type { Organization } from '@/models/organization';
import type { OrganizationMembership } from '@/models/organizationMembership';
import type { StoreListItem } from '@/models/store';

export type OrganizationDetailState = {
  error: string | null;
  isLoading: boolean;
  organization: Organization | null;
  stores: StoreListItem[];
  storesLoading: boolean;
  storesError: string | null;
  owner: OrganizationMembership | null;
  ownerLoading: boolean;
};

export function createOrganizationDetailStore() {
  return createStore<OrganizationDetailState>(() => ({
    error: null,
    isLoading: false,
    organization: null,
    stores: [],
    storesLoading: false,
    storesError: null,
    owner: null,
    ownerLoading: false,
  }));
}
