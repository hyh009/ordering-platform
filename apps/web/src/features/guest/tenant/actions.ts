import type { GuestTenantStore } from './store';

export function createGuestTenantActions(store: GuestTenantStore) {
  return {
    storeActivated(storeId: string) {
      store.setState({ activeStoreId: storeId });
    },
  };
}

export type GuestTenantActions = ReturnType<typeof createGuestTenantActions>;
