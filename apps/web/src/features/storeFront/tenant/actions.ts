import type { TenantStore } from './store';

export function createTenantActions(store: TenantStore) {
  return {
    storeActivated(storeId: string) {
      store.setState({ activeStoreId: storeId });
    },
  };
}

export type TenantActions = ReturnType<typeof createTenantActions>;
