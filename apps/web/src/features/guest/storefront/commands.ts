import { guestMenuService } from '@/services/guestMenu.service';
import {
  mapGuestApiError,
  type GuestCommandFailure,
} from '@/services/utils/guestApiError';
import type { GuestStorefrontActions } from './actions';
import type { GuestTenantStore } from '../tenant/store';

export type LoadStorefrontResult = { status: 'loaded' } | GuestCommandFailure;

export type GuestStorefrontCommands = {
  loadStore(storeId: string): Promise<LoadStorefrontResult>;
  loadStorefront(storeId: string): Promise<LoadStorefrontResult>;
};

export function createGuestStorefrontCommands(deps: {
  actions: GuestStorefrontActions;
  tenantStore: GuestTenantStore;
}): GuestStorefrontCommands {
  function isActiveStore(storeId: string) {
    return deps.tenantStore.getState().activeStoreId === storeId;
  }

  const mismatchedStore: GuestCommandFailure = {
    status: 'failed',
    message: '',
    reason: 'session-store-mismatch',
  };

  return {
    async loadStore(storeId) {
      if (!isActiveStore(storeId)) return mismatchedStore;
      deps.actions.loadStarted();

      try {
        const store = await guestMenuService.getStore(storeId);
        if (!isActiveStore(storeId)) return mismatchedStore;

        deps.actions.storeLoaded(store);
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapGuestApiError(error);

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
          guestMenuService.getStore(storeId),
          guestMenuService.getMenu(storeId),
        ]);

        if (!isActiveStore(storeId)) return mismatchedStore;
        deps.actions.loadSucceeded({ store, menu });
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapGuestApiError(error);

        if (isActiveStore(storeId)) {
          deps.actions.loadFailed(failure.message);
        }
        return failure;
      }
    },
  };
}
