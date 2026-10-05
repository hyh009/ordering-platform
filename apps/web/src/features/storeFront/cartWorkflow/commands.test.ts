import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '@/models/order';
import { storeFrontCartService } from '@/services/storeFrontCart.service';
import { createStoreFrontRuntime } from '../runtime';

vi.mock('@/services/storeFrontCart.service', () => ({
  storeFrontCartService: {
    createCart: vi.fn(),
    joinCart: vi.fn(),
    submitCart: vi.fn(),
  },
}));

function createLocalStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

function order(id: string): Order {
  return {
    id,
    storeId: 'store-a',
    createdAt: new Date().toISOString(),
  } as Order;
}

describe('storefront cart workflow order history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', { localStorage: createLocalStorage() });
  });

  it('records a submitted order with the current scoped session token', async () => {
    const runtime = createStoreFrontRuntime();
    await runtime.commands.tenant.activateStore('store-a');
    runtime.stores.session.setState({
      guestToken: 'submit-token',
      participantId: 'participant-a',
      storeId: 'store-a',
    });
    vi.mocked(storeFrontCartService.submitCart).mockResolvedValue(
      order('order-a'),
    );

    await expect(
      runtime.commands.cart.submitCart('store-a', {}),
    ).resolves.toMatchObject({ status: 'submitted', orderId: 'order-a' });
    expect(
      runtime.commands.orderHistory.findEntry('store-a', 'order-a'),
    ).toMatchObject({ guestToken: 'submit-token' });
    // The order store is hydrated so the menu add-on banner and order page see
    // the submitted round immediately; the next add-on round reuses this flow.
    expect(runtime.stores.order.getState().order).toMatchObject({
      id: 'order-a',
    });
  });

  it('records join-to-order history with the token from the join response', async () => {
    const runtime = createStoreFrontRuntime();
    await runtime.commands.tenant.activateStore('store-a');
    vi.mocked(storeFrontCartService.joinCart).mockResolvedValue({
      guestToken: 'join-token',
      session: {
        participantId: 'participant-a',
        order: order('order-a'),
      },
    });

    await expect(
      runtime.commands.cart.joinCart('store-a', {
        joinCode: 'ABC234',
        avatarKey: 'rainbow_cat',
      }),
    ).resolves.toMatchObject({
      status: 'joined',
      target: 'order',
      orderId: 'order-a',
    });
    expect(
      runtime.commands.orderHistory.findEntry('store-a', 'order-a'),
    ).toMatchObject({ guestToken: 'join-token' });
  });

  it('does not record a stale submit after the scoped session changes', async () => {
    const runtime = createStoreFrontRuntime();
    await runtime.commands.tenant.activateStore('store-a');
    runtime.stores.session.setState({
      guestToken: 'old-token',
      participantId: 'participant-a',
      storeId: 'store-a',
    });
    let resolveSubmit: ((value: Order) => void) | undefined;
    vi.mocked(storeFrontCartService.submitCart).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSubmit = resolve;
        }),
    );

    const submit = runtime.commands.cart.submitCart('store-a', {});
    runtime.stores.session.setState({
      guestToken: 'new-token',
      participantId: 'participant-b',
      storeId: 'store-a',
    });
    resolveSubmit?.(order('stale-order'));

    await expect(submit).resolves.toMatchObject({
      status: 'failed',
      reason: 'session-store-mismatch',
    });
    expect(
      runtime.commands.orderHistory.findEntry('store-a', 'stale-order'),
    ).toBeNull();
  });
});

describe('storefront assistant transcript lifetime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', { localStorage: createLocalStorage() });
  });

  function seedTranscript(runtime: ReturnType<typeof createStoreFrontRuntime>) {
    runtime.stores.aiOrdering.setState({
      entries: [{ id: 'guest-1', role: 'guest', message: 'two teas please' }],
      isLoaded: true,
    });
  }

  it('drops the previous cart transcript when a new order starts', async () => {
    const runtime = createStoreFrontRuntime();
    await runtime.commands.tenant.activateStore('store-a');
    seedTranscript(runtime);
    vi.mocked(storeFrontCartService.createCart).mockResolvedValue({
      cart: { id: 'cart-b', status: 'active' } as never,
      participantId: 'participant-b',
      guestToken: 'token-b',
    });

    await expect(
      runtime.commands.cart.createCart('store-a', {
        orderType: 'dine_in',
        avatarKey: 'owl',
      }),
    ).resolves.toEqual({ status: 'created' });

    // The transcript is keyed by cart on the server, so the new cart must start
    // unread rather than inherit the finished cart's conversation.
    expect(runtime.stores.aiOrdering.getState()).toMatchObject({
      entries: [],
      isLoaded: false,
    });
  });

  it('drops the transcript when the session is cleared', async () => {
    const runtime = createStoreFrontRuntime();
    await runtime.commands.tenant.activateStore('store-a');
    seedTranscript(runtime);

    runtime.commands.session.clearSession('store-a');

    expect(runtime.stores.aiOrdering.getState()).toMatchObject({
      entries: [],
      isLoaded: false,
    });
  });

  it('drops the transcript when another store is activated', async () => {
    const runtime = createStoreFrontRuntime();
    await runtime.commands.tenant.activateStore('store-a');
    seedTranscript(runtime);

    await runtime.commands.tenant.activateStore('store-b');

    expect(runtime.stores.aiOrdering.getState()).toMatchObject({
      entries: [],
      isLoaded: false,
    });
  });
});
