import { guestMenuService } from '@/services/guestMenu.service';
import {
  mapGuestApiError,
  type GuestCommandFailure,
} from '@/services/utils/guestApiError';
import type { GuestStorefrontActions } from './actions';
import type { GuestTenantStore } from '../tenant/store';

export type LoadStorefrontResult = { status: 'loaded' } | GuestCommandFailure;

export type GuestStorefrontCommands = {
  loadStorefront(storeId: string): Promise<LoadStorefrontResult>;
};

export function createGuestStorefrontCommands(deps: {
  actions: GuestStorefrontActions;
  tenantStore: GuestTenantStore;
}): GuestStorefrontCommands {
  return {
    async loadStorefront(storeId) {
      if (deps.tenantStore.getState().activeStoreId !== storeId) {
        return {
          status: 'failed',
          message: '',
          reason: 'session-store-mismatch',
        };
      }
      deps.actions.loadStarted();

      try {
        const [store, menu] = await Promise.all([
          guestMenuService.getStore(storeId),
          guestMenuService.getMenu(storeId),
        ]);

        if (deps.tenantStore.getState().activeStoreId !== storeId) {
          return {
            status: 'failed',
            message: '',
            reason: 'session-store-mismatch',
          };
        }
        deps.actions.loadSucceeded({ store, menu });
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapGuestApiError(error);

        if (deps.tenantStore.getState().activeStoreId === storeId) {
          deps.actions.loadFailed(failure.message);
        }
        return failure;
      }
    },
  };
}
