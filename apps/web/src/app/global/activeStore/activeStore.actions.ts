import type { StoreLocaleDto } from '@/models/store';
import { activeStoreStore } from './activeStore.store';

export const activeStoreActions = {
  setStore(
    storeId: string,
    storeName: string,
    organizationId: string,
    locale: StoreLocaleDto | null,
  ) {
    activeStoreStore.setState({ storeId, storeName, organizationId, locale });
  },

  setLocale(locale: StoreLocaleDto) {
    activeStoreStore.setState({ locale });
  },

  clearStore() {
    activeStoreStore.setState({
      storeId: null,
      storeName: null,
      organizationId: null,
      locale: null,
    });
  },
};
