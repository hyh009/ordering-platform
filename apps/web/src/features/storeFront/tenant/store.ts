import { createStore } from 'zustand/vanilla';

export type TenantState = {
  activeStoreId: string | null;
};

export function createTenantStore() {
  return createStore<TenantState>(() => ({
    activeStoreId: null,
  }));
}

export type TenantStore = ReturnType<typeof createTenantStore>;
