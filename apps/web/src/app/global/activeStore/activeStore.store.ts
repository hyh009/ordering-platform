import { createStore } from 'zustand/vanilla';

export type ActiveStoreState = {
  storeId: string | null;
  organizationId: string | null;
};

export const activeStoreStore = createStore<ActiveStoreState>(() => ({
  storeId: null,
  organizationId: null,
}));
