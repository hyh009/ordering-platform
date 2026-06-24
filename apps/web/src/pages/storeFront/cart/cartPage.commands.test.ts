import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/apiError';
import { createStoreFrontRuntime } from '@/features/storeFront/runtime';
import type { Cart, GuestSession } from '@/models/cart';
import type { Order } from '@/models/order';
import { storeFrontCartService } from '@/services/storeFrontCart.service';
import { createCartPageCommands } from './cartPage.commands';

vi.mock('@/services/storeFrontCart.service', () => ({
  storeFrontCartService: {
    getCart: vi.fn(),
    getSession: vi.fn(),
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

function seedSession() {
  window.localStorage.setItem(
    'ordering-platform.guestSession:store-a',
    JSON.stringify({
      guestToken: 'token-a',
      participantId: 'participant-a',
      storeId: 'store-a',
    }),
  );
}

describe('cart page commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', { localStorage: createLocalStorage() });
    seedSession();
  });

  it('routes to order tracking when the cart is terminal but an order exists', async () => {
    const runtime = createStoreFrontRuntime();
    // No live draft cart, only a submitted order: hand off to order tracking
    // instead of dead-ending on an empty cart.
    vi.mocked(storeFrontCartService.getSession).mockResolvedValue({
      participantId: 'participant-a',
      order: { id: 'order-a', storeId: 'store-a' } as Order,
    } satisfies GuestSession);

    await expect(
      createCartPageCommands(runtime).initialize('store-a'),
    ).resolves.toEqual({ status: 'order', orderId: 'order-a' });
  });

  it('stays on the cart during an add-on round (live cart + order)', async () => {
    const runtime = createStoreFrontRuntime();
    // Both a live draft cart and a submitted order: keep the participant on the
    // cart so they can add to the next round, and hydrate the order for the
    // banner/link.
    vi.mocked(storeFrontCartService.getSession).mockResolvedValue({
      participantId: 'participant-a',
      cart: { id: 'cart-a', status: 'active' } as Cart,
      order: { id: 'order-a', storeId: 'store-a' } as Order,
    } satisfies GuestSession);

    await expect(
      createCartPageCommands(runtime).initialize('store-a'),
    ).resolves.toEqual({ status: 'loaded' });
    expect(runtime.stores.order.getState().order?.id).toBe('order-a');
  });

  it('falls back to landing when the cart is terminal and no order exists', async () => {
    const runtime = createStoreFrontRuntime();
    // No order, no usable cart: the resumed session has ended.
    vi.mocked(storeFrontCartService.getSession).mockResolvedValue({
      participantId: 'participant-a',
    } satisfies GuestSession);

    await expect(
      createCartPageCommands(runtime).initialize('store-a'),
    ).resolves.toEqual({ status: 'none' });
  });

  it('returns the failure on a transient error so the VM can stay put', async () => {
    const runtime = createStoreFrontRuntime();
    // A transient server error must not masquerade as a gone session: the VM
    // should surface it and keep the participant on the cart, not bounce to
    // landing.
    vi.mocked(storeFrontCartService.getSession).mockRejectedValue(
      new ApiError({
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong.',
        statusCode: 500,
      }),
    );

    await expect(
      createCartPageCommands(runtime).initialize('store-a'),
    ).resolves.toMatchObject({ status: 'failed' });
  });

  it('loads the live draft cart when one is active', async () => {
    const runtime = createStoreFrontRuntime();
    vi.mocked(storeFrontCartService.getSession).mockResolvedValue({
      participantId: 'participant-a',
      cart: { id: 'cart-a', status: 'active' } as Cart,
    } satisfies GuestSession);

    await expect(
      createCartPageCommands(runtime).initialize('store-a'),
    ).resolves.toEqual({ status: 'loaded' });
    expect(storeFrontCartService.getCart).not.toHaveBeenCalled();
  });
});
