import { storeFrontMenuService } from '@/services/storeFrontMenu.service';
import {
  mapStoreFrontApiError,
  type StoreFrontCommandFailure,
} from '@/services/utils/storeFrontApiError';
import type { StorefrontActions } from './actions';
import type { TenantStore } from '../tenant/store';

export type LoadStorefrontResult = { status: 'loaded' } | StoreFrontCommandFailure;

export type StorefrontCommands = {
  loadStore(storeId: string): Promise<LoadStorefrontResult>;
  loadStorefront(storeId: string): Promise<LoadStorefrontResult>;
};

export function createStorefrontCommands(deps: {
  actions: StorefrontActions;
  tenantStore: TenantStore;
}): StorefrontCommands {
  function isActiveStore(storeId: string) {
    return deps.tenantStore.getState().activeStoreId === storeId;
  }

  const mismatchedStore: StoreFrontCommandFailure = {
    status: 'failed',
    message: '',
    reason: 'session-store-mismatch',
  };

  return {
    async loadStore(storeId) {
      if (!isActiveStore(storeId)) return mismatchedStore;
      deps.actions.loadStarted();

      try {
        const store = await storeFrontMenuService.getStore(storeId);
        if (!isActiveStore(storeId)) return mismatchedStore;

        deps.actions.storeLoaded(store);
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapStoreFrontApiError(error);

        if (isActiveStore(storeId)) {
          deps.actions.loadFailed(failure.message);
        }
        return failure;
      }
    },

    async loadStorefront(storeId) {
      if (!isActiveStore(storeId)) return mismatchedStore;
      deps.actions.loadStarted();

      try {
        const [store, menu] = await Promise.all([
          storeFrontMenuService.getStore(storeId),
          storeFrontMenuService.getMenu(storeId),
        ]);

        if (!isActiveStore(storeId)) return mismatchedStore;
        deps.actions.loadSucceeded({ store, menu });
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapStoreFrontApiError(error);

        if (isActiveStore(storeId)) {
          deps.actions.loadFailed(failure.message);
        }
        return failure;
      }
    },
  };
}
