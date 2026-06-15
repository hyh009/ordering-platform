import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '@/models/order';
import { storeFrontCartService } from '@/services/storeFrontCart.service';
import { createStoreFrontRuntime } from '../runtime';

vi.mock('@/services/storeFrontCart.service', () => ({
  storeFrontCartService: {
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
    vi.mocked(storeFrontCartService.submitCart).mockResolvedValue(order('order-a'));

    await expect(
      runtime.commands.cart.submitCart('store-a', {}),
    ).resolves.toMatchObject({ status: 'submitted', orderId: 'order-a' });
    expect(
      runtime.commands.orderHistory.findEntry('store-a', 'order-a'),
    ).toMatchObject({ guestToken: 'submit-token' });
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
      runtime.commands.cart.joinCart('store-a', { joinCode: 'ABC123' }),
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
