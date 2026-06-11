import { createStore } from 'zustand/vanilla';

export type GuestTenantState = {
  activeStoreId: string | null;
};

export function createGuestTenantStore() {
  return createStore<GuestTenantState>(() => ({
    activeStoreId: null,
  }));
}

export type GuestTenantStore = ReturnType<typeof createGuestTenantStore>;
