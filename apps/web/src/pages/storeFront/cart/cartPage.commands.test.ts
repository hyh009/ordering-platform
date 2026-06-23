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
    vi.mocked(storeFrontCartService.getCart).mockRejectedValue(
      new ApiError({
        code: 'CART_NOT_ACTIVE',
        message: 'Cart is no longer active.',
        statusCode: 409,
      }),
    );
    vi.mocked(storeFrontCartService.getSession).mockResolvedValue({
      participantId: 'participant-a',
      order: { id: 'order-a', storeId: 'store-a' } as Order,
    } satisfies GuestSession);

    await expect(
      createCartPageCommands(runtime).initialize('store-a'),
    ).resolves.toEqual({ status: 'order', orderId: 'order-a' });
  });

  it('falls back to landing when the cart is terminal and no order exists', async () => {
    const runtime = createStoreFrontRuntime();
    vi.mocked(storeFrontCartService.getCart).mockRejectedValue(
      new ApiError({
        code: 'CART_NOT_ACTIVE',
        message: 'Cart is no longer active.',
        statusCode: 409,
      }),
    );
    // No order, no usable cart: the resumed session has ended.
    vi.mocked(storeFrontCartService.getSession).mockResolvedValue({
      participantId: 'participant-a',
    } satisfies GuestSession);

    await expect(
      createCartPageCommands(runtime).initialize('store-a'),
    ).resolves.toEqual({ status: 'none' });
  });

  it('loads the live draft cart when one is active', async () => {
    const runtime = createStoreFrontRuntime();
    vi.mocked(storeFrontCartService.getCart).mockResolvedValue({
      id: 'cart-a',
      status: 'active',
    } as Cart);

    await expect(
      createCartPageCommands(runtime).initialize('store-a'),
    ).resolves.toEqual({ status: 'loaded' });
    expect(storeFrontCartService.getSession).not.toHaveBeenCalled();
  });
});
