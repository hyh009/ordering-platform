import { createStore } from 'zustand/vanilla';
import type { Organization } from '@/models/organization.types';

export type OrganizationDetailState = {
  error: string | null;
  isLoading: boolean;
  organization: Organization | null;
};

export function createOrganizationDetailStore() {
  return createStore<OrganizationDetailState>(() => ({
    error: null,
    isLoading: false,
    organization: null,
  }));
}
