import { createStore } from 'zustand/vanilla';

export type ActiveOrgState = {
  organizationId: string | null;
  organizationName: string | null;
};

export const activeOrgStore = createStore<ActiveOrgState>(() => ({
  organizationId: null,
  organizationName: null,
}));
