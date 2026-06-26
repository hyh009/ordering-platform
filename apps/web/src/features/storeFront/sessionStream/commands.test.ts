import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGuestSessionStore } from '@/app/global/guestSession/guestSession.store';
import { storeFrontGuestStreamService } from '@/services/storeFrontGuestStream.service';
import type { Cart } from '@/models/cart';
import type { Order } from '@/models/order';
import { createStoreFrontCartActions } from '../cart/actions';
import { createStoreFrontCartStore } from '../cart/store';
import { createStoreFrontOrderActions } from '../order/actions';
import { createStoreFrontOrderStore } from '../order/store';
import { createTenantStore } from '../tenant/store';
import { createStoreFrontSessionStreamCommands } from './commands';

vi.mock('@/services/storeFrontGuestStream.service', () => ({
  storeFrontGuestStreamService: {
    subscribeGuestStream: vi.fn(),
  },
}));

type Handlers = Parameters<
  typeof storeFrontGuestStreamService.subscribeGuestStream
>[1];

function setup() {
  const cartStore = createStoreFrontCartStore();
  const orderStore = createStoreFrontOrderStore();
  const sessionStore = createGuestSessionStore();
  const tenantStore = createTenantStore();

  sessionStore.setState({
    guestToken: 'token-a',
    participantId: 'p-a',
    storeId: 'store-a',
  });
  tenantStore.setState({ activeStoreId: 'store-a' });

  const close = vi.fn();
  let captured: Handlers | null = null;
  vi.mocked(storeFrontGuestStreamService.subscribeGuestStream).mockImplementation(
    (_token, handlers) => {
      captured = handlers;
      return { close };
    },
  );

  const commands = createStoreFrontSessionStreamCommands({
    cartActions: createStoreFrontCartActions(cartStore),
    orderActions: createStoreFrontOrderActions(orderStore),
    sessionStore,
    tenantStore,
  });

  return {
    cartStore,
    orderStore,
    sessionStore,
    tenantStore,
    close,
    commands,
    getHandlers: () => {
      if (!captured) throw new Error('subscribeGuestStream was not called');
      return captured;
    },
  };
}

describe('storefront session stream commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no-ops without subscribing when there is no scoped guest token', () => {
    const ctx = setup();
    ctx.sessionStore.setState({
      guestToken: null,
      participantId: null,
      storeId: null,
    });

    const disconnect = ctx.commands.connectSessionStream('store-a');
    disconnect();

    expect(
      storeFrontGuestStreamService.subscribeGuestStream,
    ).not.toHaveBeenCalled();
  });

  it('routes cart_updated to the cart store and order_updated to the order store', () => {
    const ctx = setup();
    ctx.commands.connectSessionStream('store-a');

    const cart = { id: 'c1', storeId: 'store-a' } as Cart;
    ctx.getHandlers().onCartUpdated(cart);
    expect(ctx.cartStore.getState().cart).toBe(cart);

    const order = { id: 'o1', storeId: 'store-a' } as Order;
    ctx.getHandlers().onOrderUpdated(order);
    expect(ctx.orderStore.getState().order).toBe(order);
  });

  it('drops pushed updates after the active store changes', () => {
    const ctx = setup();
    ctx.commands.connectSessionStream('store-a');

    ctx.tenantStore.setState({ activeStoreId: 'store-b' });
    ctx.getHandlers().onCartUpdated({ id: 'c1', storeId: 'store-a' } as Cart);

    expect(ctx.cartStore.getState().cart).toBeNull();
  });

  it('drops pushed updates after the session token is replaced', () => {
    const ctx = setup();
    ctx.commands.connectSessionStream('store-a');

    ctx.sessionStore.setState({ guestToken: 'token-b' });
    ctx.getHandlers().onOrderUpdated({ id: 'o1', storeId: 'store-a' } as Order);

    expect(ctx.orderStore.getState().order).toBeNull();
  });

  it('closes the connection when the disposer runs', () => {
    const ctx = setup();
    const disconnect = ctx.commands.connectSessionStream('store-a');

    disconnect();

    expect(ctx.close).toHaveBeenCalledTimes(1);
  });
});
