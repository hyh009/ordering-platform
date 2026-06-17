import { createStore } from 'zustand/vanilla';
import type { StoreLocaleDto } from '@/models/store';

export type ActiveStoreState = {
  storeId: string | null;
  storeName: string | null;
  organizationId: string | null;
  /** Locale config of the active store, used to drive localized inputs. */
  locale: StoreLocaleDto | null;
};

export const activeStoreStore = createStore<ActiveStoreState>(() => ({
  storeId: null,
  storeName: null,
  organizationId: null,
  locale: null,
}));
