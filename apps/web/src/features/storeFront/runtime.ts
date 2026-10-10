import { createGuestSessionActions } from '@/app/global/guestSession/guestSession.actions';
import { createGuestSessionCommands } from '@/app/global/guestSession/guestSession.commands';
import { createGuestSessionStore } from '@/app/global/guestSession/guestSession.store';
import { createStoreFrontAiOrderingActions } from './aiOrdering/actions';
import { createStoreFrontAiOrderingCommands } from './aiOrdering/commands';
import { createStoreFrontAiOrderingStore } from './aiOrdering/store';
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
import { createStoreFrontSessionStreamCommands } from './sessionStream/commands';
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
  const aiOrderingStore = createStoreFrontAiOrderingStore();

  const sessionActions = createGuestSessionActions(sessionStore);
  const storefrontActions = createStorefrontActions(storefrontStore);
  const cartActions = createStoreFrontCartActions(cartStore);
  const orderActions = createStoreFrontOrderActions(orderStore);
  const tenantActions = createTenantActions(tenantStore);
  const orderHistoryActions =
    createStoreFrontOrderHistoryActions(orderHistoryStore);
  const aiOrderingActions = createStoreFrontAiOrderingActions(aiOrderingStore);
  const guestSessionCommands = createGuestSessionCommands(
    sessionActions,
    sessionStore,
  );
  const sessionWorkflowCommands = createStoreFrontSessionWorkflowCommands({
    guestSessionCommands,
    aiOrderingActions,
    cartActions,
    orderActions,
    sessionStore,
    tenantStore,
  });
  const cartCommands = createStoreFrontCartCommands({
    cartActions,
    cartStore,
    sessionStore,
    tenantStore,
  });
  const tenantWorkflowCommands = createTenantWorkflowCommands({
    aiOrderingActions,
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
  // The assistant proposes and the BACKEND applies, so there is no cart write
  // path here. The decision response carries the resulting cart, which is handed
  // to the cart actions the same way the SSE stream hands over a cart it was
  // pushed — there is one cart store and one way into it.
  const aiOrderingCommands = createStoreFrontAiOrderingCommands({
    actions: aiOrderingActions,
    store: aiOrderingStore,
    cartActions,
    cartStore,
    sessionStore,
    tenantStore,
  });
  const sessionStreamCommands = createStoreFrontSessionStreamCommands({
    cartActions,
    orderActions,
    orderHistoryCommands,
    sessionStore,
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
      aiOrdering: aiOrderingStore,
    },
    commands: {
      session: sessionWorkflowCommands,
      tenant: tenantWorkflowCommands,
      storefront: createStorefrontCommands({
        actions: storefrontActions,
        tenantStore,
      }),
      cart: createStoreFrontCartWorkflowCommands({
        aiOrderingActions,
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
      sessionStream: sessionStreamCommands,
      aiOrdering: aiOrderingCommands,
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
