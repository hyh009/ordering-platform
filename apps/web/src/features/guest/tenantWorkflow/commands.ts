import type { GuestSessionCommands } from '@/app/global/guestSession/guestSession.commands';
import type { GuestCartActions } from '../cart/actions';
import type { GuestOrderActions } from '../order/actions';
import type { GuestStorefrontActions } from '../storefront/actions';
import type { GuestTenantActions } from '../tenant/actions';
import type { GuestTenantStore } from '../tenant/store';

export type GuestTenantWorkflowCommands = {
  activateStore(storeId: string): Promise<void>;
};

export function createGuestTenantWorkflowCommands(deps: {
  cartActions: GuestCartActions;
  guestSessionCommands: GuestSessionCommands;
  orderActions: GuestOrderActions;
  storefrontActions: GuestStorefrontActions;
  tenantActions: GuestTenantActions;
  tenantStore: GuestTenantStore;
}): GuestTenantWorkflowCommands {
  let activation = Promise.resolve();

  return {
    activateStore(storeId) {
      activation = activation.then(() => {
        if (deps.tenantStore.getState().activeStoreId === storeId) return;

        deps.storefrontActions.storefrontCleared();
        deps.cartActions.cartCleared();
        deps.orderActions.orderCleared();
        deps.guestSessionCommands.deactivateSession();
        deps.tenantActions.storeActivated(storeId);
      });

      return activation;
    },
  };
}
