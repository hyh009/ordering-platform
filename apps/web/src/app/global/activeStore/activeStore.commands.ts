import { activeStoreActions } from './activeStore.actions';

type StoredActiveStore = {
  storeId: string;
  organizationId: string;
};

const STORAGE_KEY = 'activeStore';

export const activeStoreCommands = {
  initialize(activeOrgId: string | null) {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw || !activeOrgId) {
      activeStoreActions.clearStore();
      return;
    }

    try {
      const parsed = JSON.parse(raw) as StoredActiveStore;

      if (parsed.organizationId === activeOrgId) {
        activeStoreActions.setStore(parsed.storeId, parsed.organizationId);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        activeStoreActions.clearStore();
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      activeStoreActions.clearStore();
    }
  },

  setStore(storeId: string, organizationId: string) {
    const value: StoredActiveStore = { storeId, organizationId };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    activeStoreActions.setStore(storeId, organizationId);
  },

  clearStore() {
    localStorage.removeItem(STORAGE_KEY);
    activeStoreActions.clearStore();
  },
};
