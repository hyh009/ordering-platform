import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGuestSessionActions } from '@/app/global/guestSession/guestSession.actions';
import { createGuestSessionCommands } from '@/app/global/guestSession/guestSession.commands';
import { loadStoredGuestSession } from '@/app/global/guestSession/guestSession.storage';
import { createGuestSessionStore } from '@/app/global/guestSession/guestSession.store';
import { storeFrontGuestStreamService } from '@/services/storeFrontGuestStream.service';
import type { Cart } from '@/models/cart';
import type { Order } from '@/models/order';
import { createStoreFrontCartActions } from '../cart/actions';
import { createStoreFrontCartStore } from '../cart/store';
import { createStoreFrontOrderActions } from '../order/actions';
import { createStoreFrontOrderStore } from '../order/store';
import { createStoreFrontOrderHistoryActions } from '../orderHistory/actions';
import { createStoreFrontOrderHistoryCommands } from '../orderHistory/commands';
import { createStoreFrontOrderHistoryStore } from '../orderHistory/store';
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
  const orderHistoryStore = createStoreFrontOrderHistoryStore();
  const sessionStore = createGuestSessionStore();
  const tenantStore = createTenantStore();
  const guestSessionCommands = createGuestSessionCommands(
    createGuestSessionActions(sessionStore),
    sessionStore,
  );
  const realOrderHistoryCommands = createStoreFrontOrderHistoryCommands({
    actions: createStoreFrontOrderHistoryActions(orderHistoryStore),
    tenantStore,
  });
  const recordOrder = vi.fn(realOrderHistoryCommands.recordOrder);

  guestSessionCommands.startSession({
    guestToken: 'token-a',
    participantId: 'p-a',
    storeId: 'store-a',
  });
  tenantStore.setState({ activeStoreId: 'store-a' });

  const close = vi.fn();
  let captured: Handlers | null = null;
  vi.mocked(
    storeFrontGuestStreamService.subscribeGuestStream,
  ).mockImplementation((_token, handlers) => {
    captured = handlers;
    return { close };
  });

  const commands = createStoreFrontSessionStreamCommands({
    cartActions: createStoreFrontCartActions(cartStore),
    orderActions: createStoreFrontOrderActions(orderStore),
    orderHistoryCommands: {
      ...realOrderHistoryCommands,
      recordOrder,
    },
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
    recordOrder,
  };
}

describe('storefront session stream commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const values = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
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

    const order = {
      id: 'o1',
      storeId: 'store-a',
      createdAt: new Date().toISOString(),
      canAddOn: true,
    } as Order;
    ctx.getHandlers().onOrderUpdated(order);
    expect(ctx.orderStore.getState().order).toBe(order);
  });

  it('records streamed orders into local history with the scoped token', () => {
    const ctx = setup();
    ctx.commands.connectSessionStream('store-a');

    ctx.getHandlers().onOrderUpdated({
      id: 'o1',
      storeId: 'store-a',
      createdAt: new Date().toISOString(),
      canAddOn: true,
    } as Order);

    const raw = window.localStorage.getItem(
      'ordering-platform.storeFrontOrderHistory:store-a',
    );
    expect(raw ? JSON.parse(raw) : null).toMatchObject([
      {
        storeId: 'store-a',
        orderId: 'o1',
        guestToken: 'token-a',
      },
    ]);
  });

  it('clears only the draft cart when a streamed order can no longer be added to but is not terminal', () => {
    const ctx = setup();
    ctx.cartStore.setState({
      cart: { id: 'c1', storeId: 'store-a', status: 'active' } as Cart,
    });
    ctx.commands.connectSessionStream('store-a');

    ctx.getHandlers().onOrderUpdated({
      id: 'o1',
      storeId: 'store-a',
      createdAt: new Date().toISOString(),
      status: 'pending_confirmation',
      canAddOn: false,
    } as Order);

    expect(ctx.cartStore.getState().cart).toBeNull();
    expect(ctx.sessionStore.getState().guestToken).toBe('token-a');
    expect(loadStoredGuestSession('store-a')).toMatchObject({
      guestToken: 'token-a',
    });
  });

  it('clears the draft cart on a terminal streamed order but keeps the guest session and order snapshot', () => {
    const ctx = setup();
    ctx.cartStore.setState({
      cart: { id: 'c1', storeId: 'store-a', status: 'active' } as Cart,
    });
    ctx.commands.connectSessionStream('store-a');

    const order = {
      id: 'o1',
      storeId: 'store-a',
      createdAt: new Date().toISOString(),
      status: 'completed',
      canAddOn: false,
    } as Order;
    ctx.getHandlers().onOrderUpdated(order);

    expect(ctx.recordOrder).toHaveBeenCalledWith('store-a', order, 'token-a');
    expect(ctx.cartStore.getState().cart).toBeNull();
    // The session outlives the terminal order on purpose: the token keeps the
    // stream open, and the stream's connect-time snapshot is how a client
    // re-learns this terminal state. It ends on an explicit leave instead.
    expect(ctx.sessionStore.getState().guestToken).toBe('token-a');
    expect(loadStoredGuestSession('store-a')).toMatchObject({
      guestToken: 'token-a',
    });
    expect(ctx.orderStore.getState().order).toBe(order);

    const raw = window.localStorage.getItem(
      'ordering-platform.storeFrontOrderHistory:store-a',
    );
    expect(raw ? JSON.parse(raw) : null).toMatchObject([
      {
        storeId: 'store-a',
        orderId: 'o1',
        guestToken: 'token-a',
      },
    ]);
  });

  it('keeps the guest session when a streamed order is cancelled', () => {
    const ctx = setup();
    ctx.cartStore.setState({
      cart: { id: 'c1', storeId: 'store-a', status: 'active' } as Cart,
    });
    ctx.commands.connectSessionStream('store-a');

    const order = {
      id: 'o1',
      storeId: 'store-a',
      createdAt: new Date().toISOString(),
      status: 'cancelled',
      canAddOn: false,
    } as Order;
    ctx.getHandlers().onOrderUpdated(order);

    expect(ctx.recordOrder).toHaveBeenCalledWith('store-a', order, 'token-a');
    expect(ctx.cartStore.getState().cart).toBeNull();
    expect(ctx.sessionStore.getState().guestToken).toBe('token-a');
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
