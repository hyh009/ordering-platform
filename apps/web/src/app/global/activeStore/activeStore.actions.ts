import { activeStoreStore } from './activeStore.store';

export const activeStoreActions = {
  setStore(storeId: string, organizationId: string) {
    activeStoreStore.setState({ storeId, organizationId });
  },

  clearStore() {
    activeStoreStore.setState({ storeId: null, organizationId: null });
  },
};
