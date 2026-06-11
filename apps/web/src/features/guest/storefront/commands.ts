import { guestMenuService } from '@/services/guestMenu.service';
import {
  mapGuestApiError,
  type GuestCommandFailure,
} from '@/services/utils/guestApiError';
import type { GuestStorefrontActions } from './actions';

export type LoadStorefrontResult = { status: 'loaded' } | GuestCommandFailure;

export type GuestStorefrontCommands = {
  loadStorefront(storeId: string): Promise<LoadStorefrontResult>;
};

export function createGuestStorefrontCommands(
  actions: GuestStorefrontActions,
): GuestStorefrontCommands {
  return {
    async loadStorefront(storeId) {
      actions.loadStarted();

      try {
        const [store, menu] = await Promise.all([
          guestMenuService.getStore(storeId),
          guestMenuService.getMenu(storeId),
        ]);

        actions.loadSucceeded({ store, menu });
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapGuestApiError(error);

        actions.loadFailed(failure.message);
        return failure;
      }
    },
  };
}
