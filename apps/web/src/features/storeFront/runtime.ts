import { createGuestSessionActions } from '@/app/global/guestSession/guestSession.actions';
import { createGuestSessionCommands } from '@/app/global/guestSession/guestSession.commands';
import { createGuestSessionStore } from '@/app/global/guestSession/guestSession.store';
import { createStoreFrontCartActions } from './cart/actions';
import { createStoreFrontCartCommands } from './cart/commands';
import { createStoreFrontCartStore } from './cart/store';
import { createStoreFrontCartWorkflowCommands } from './cartWorkflow/commands';
import { createStoreFrontOrderActions } from './order/actions';
import { createStoreFrontOrderCommands } from './order/commands';
import { createStoreFrontOrderStore } from './order/store';
import { createStoreFrontOrderHistoryActions } from './orderHistory/actions';
import { createStoreFrontOrderHistoryCommands } from './orderHistory/commands';
import { createStoreFrontOrderHistoryStore } from './orderHistory/store';
import { createStoreFrontSessionWorkflowCommands } from './sessionWorkflow/commands';
import { createStorefrontActions } from './storefront/actions';
import { createStorefrontCommands } from './storefront/commands';
import { createStorefrontStore } from './storefront/store';
import { createTenantActions } from './tenant/actions';
import { createTenantStore } from './tenant/store';
import { createTenantWorkflowCommands } from './tenantWorkflow/commands';

export function createStoreFrontRuntime() {
  const sessionStore = createGuestSessionStore();
  const storefrontStore = createStorefrontStore();
  const cartStore = createStoreFrontCartStore();
  const orderStore = createStoreFrontOrderStore();
  const tenantStore = createTenantStore();
  const orderHistoryStore = createStoreFrontOrderHistoryStore();

  const sessionActions = createGuestSessionActions(sessionStore);
  const storefrontActions = createStorefrontActions(storefrontStore);
  const cartActions = createStoreFrontCartActions(cartStore);
  const orderActions = createStoreFrontOrderActions(orderStore);
  const tenantActions = createTenantActions(tenantStore);
  const orderHistoryActions = createStoreFrontOrderHistoryActions(orderHistoryStore);
  const guestSessionCommands = createGuestSessionCommands(
    sessionActions,
    sessionStore,
  );
  const sessionWorkflowCommands = createStoreFrontSessionWorkflowCommands({
    guestSessionCommands,
    cartActions,
    orderActions,
    sessionStore,
    tenantStore,
  });
  const cartCommands = createStoreFrontCartCommands({
    cartActions,
    sessionStore,
    tenantStore,
  });
  const tenantWorkflowCommands = createTenantWorkflowCommands({
    cartActions,
    guestSessionCommands,
    orderActions,
    storefrontActions,
    tenantActions,
    tenantStore,
  });
  const orderHistoryCommands = createStoreFrontOrderHistoryCommands({
    actions: orderHistoryActions,
    tenantStore,
  });

  return {
    stores: {
      session: sessionStore,
      storefront: storefrontStore,
      cart: cartStore,
      order: orderStore,
      tenant: tenantStore,
      orderHistory: orderHistoryStore,
    },
    commands: {
      session: sessionWorkflowCommands,
      tenant: tenantWorkflowCommands,
      storefront: createStorefrontCommands({
        actions: storefrontActions,
        tenantStore,
      }),
      cart: createStoreFrontCartWorkflowCommands({
        cartCommands,
        guestSessionCommands,
        orderActions,
        orderHistoryCommands,
        sessionStore,
        sessionWorkflowCommands,
      }),
      order: createStoreFrontOrderCommands({
        orderActions,
        sessionStore,
        tenantStore,
      }),
      orderHistory: orderHistoryCommands,
    },
  };
}

export type StoreFrontRuntime = ReturnType<typeof createStoreFrontRuntime>;

let sharedStoreFrontRuntime: StoreFrontRuntime | null = null;

/**
 * All storefront pages share one live runtime: the menu page's cart bar, the cart
 * page, and the tracking page observe the same stores.
 */
export function getStoreFrontRuntime(): StoreFrontRuntime {
  sharedStoreFrontRuntime ??= createStoreFrontRuntime();
  return sharedStoreFrontRuntime;
}
