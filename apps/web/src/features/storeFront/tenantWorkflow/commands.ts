import type { GuestSessionCommands } from '@/app/global/guestSession/guestSession.commands';
import type { StoreFrontCartActions } from '../cart/actions';
import type { StoreFrontOrderActions } from '../order/actions';
import type { StorefrontActions } from '../storefront/actions';
import type { TenantActions } from '../tenant/actions';
import type { TenantStore } from '../tenant/store';

export type TenantWorkflowCommands = {
  activateStore(storeId: string): Promise<void>;
};

export function createTenantWorkflowCommands(deps: {
  cartActions: StoreFrontCartActions;
  guestSessionCommands: GuestSessionCommands;
  orderActions: StoreFrontOrderActions;
  storefrontActions: StorefrontActions;
  tenantActions: TenantActions;
  tenantStore: TenantStore;
}): TenantWorkflowCommands {
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
