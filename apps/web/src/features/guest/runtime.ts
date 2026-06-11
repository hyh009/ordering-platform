import { createGuestSessionActions } from '@/app/global/guestSession/guestSession.actions';
import { createGuestSessionCommands } from '@/app/global/guestSession/guestSession.commands';
import { createGuestSessionStore } from '@/app/global/guestSession/guestSession.store';
import { createGuestCartActions } from './cart/actions';
import { createGuestCartCommands } from './cart/commands';
import { createGuestCartStore } from './cart/store';
import { createGuestCartWorkflowCommands } from './cartWorkflow/commands';
import { createGuestOrderActions } from './order/actions';
import { createGuestOrderCommands } from './order/commands';
import { createGuestOrderStore } from './order/store';
import { createGuestSessionWorkflowCommands } from './sessionWorkflow/commands';
import { createGuestStorefrontActions } from './storefront/actions';
import { createGuestStorefrontCommands } from './storefront/commands';
import { createGuestStorefrontStore } from './storefront/store';

export function createGuestRuntime() {
  const sessionStore = createGuestSessionStore();
  const storefrontStore = createGuestStorefrontStore();
  const cartStore = createGuestCartStore();
  const orderStore = createGuestOrderStore();

  const sessionActions = createGuestSessionActions(sessionStore);
  const storefrontActions = createGuestStorefrontActions(storefrontStore);
  const cartActions = createGuestCartActions(cartStore);
  const orderActions = createGuestOrderActions(orderStore);
  const guestSessionCommands = createGuestSessionCommands(sessionActions);
  const sessionWorkflowCommands = createGuestSessionWorkflowCommands({
    guestSessionCommands,
    cartActions,
    orderActions,
  });
  const cartCommands = createGuestCartCommands({
    cartActions,
    sessionStore,
  });

  return {
    stores: {
      session: sessionStore,
      storefront: storefrontStore,
      cart: cartStore,
      order: orderStore,
    },
    commands: {
      session: sessionWorkflowCommands,
      storefront: createGuestStorefrontCommands(storefrontActions),
      cart: createGuestCartWorkflowCommands({
        cartCommands,
        guestSessionCommands,
        orderActions,
        sessionWorkflowCommands,
      }),
      order: createGuestOrderCommands({ orderActions, sessionStore }),
    },
  };
}

export type GuestRuntime = ReturnType<typeof createGuestRuntime>;

let sharedGuestRuntime: GuestRuntime | null = null;

/**
 * All guest pages share one live runtime: the menu page's cart bar, the cart
 * page, and the tracking page observe the same stores.
 */
export function getGuestRuntime(): GuestRuntime {
  sharedGuestRuntime ??= createGuestRuntime();
  return sharedGuestRuntime;
}
