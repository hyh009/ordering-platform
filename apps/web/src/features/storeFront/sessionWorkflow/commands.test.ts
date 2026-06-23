import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/apiError';
import {
  loadStoredGuestSession,
  saveStoredGuestSession,
} from '@/app/global/guestSession/guestSession.storage';
import { storeFrontCartService } from '@/services/storeFrontCart.service';
import { createStoreFrontRuntime } from '../runtime';

vi.mock('@/services/storeFrontCart.service', () => ({
  storeFrontCartService: {
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

describe('storefront session workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', { localStorage: createLocalStorage() });
  });

  it('validates lazily on resume and clears only the expired store', async () => {
    saveStoredGuestSession({
      guestToken: 'token-a',
      participantId: 'participant-a',
      storeId: 'store-a',
    });
    saveStoredGuestSession({
      guestToken: 'token-b',
      participantId: 'participant-b',
      storeId: 'store-b',
    });
    const runtime = createStoreFrontRuntime();
    await runtime.commands.tenant.activateStore('store-a');

    await expect(
      runtime.commands.session.restoreSession('store-a'),
    ).resolves.toEqual({
      status: 'restored',
      session: {
        guestToken: 'token-a',
        participantId: 'participant-a',
        storeId: 'store-a',
      },
    });
    expect(storeFrontCartService.getSession).not.toHaveBeenCalled();

    vi.mocked(storeFrontCartService.getSession).mockRejectedValue(
      new ApiError({
        code: 'INVALID_GUEST_TOKEN',
        message: 'Invalid guest token.',
        statusCode: 401,
      }),
    );

    await expect(
      runtime.commands.session.resumeSession('store-a'),
    ).resolves.toEqual({
      status: 'ended',
    });
    expect(loadStoredGuestSession('store-a')).toBeNull();
    expect(loadStoredGuestSession('store-b')).not.toBeNull();
  });

  it('resumes into order tracking and hydrates both stores when a draft cart and order coexist', async () => {
    saveStoredGuestSession({
      guestToken: 'token-a',
      participantId: 'participant-a',
      storeId: 'store-a',
    });
    const runtime = createStoreFrontRuntime();
    await runtime.commands.tenant.activateStore('store-a');

    vi.mocked(storeFrontCartService.getSession).mockResolvedValue({
      participantId: 'participant-a',
      cart: { id: 'cart-a', status: 'active' } as never,
      order: {
        id: 'order-a',
        storeId: 'store-a',
        checkoutMode: 'pay_later',
        paymentStatus: 'unpaid',
        status: 'pending_confirmation',
      } as never,
    });

    await expect(
      runtime.commands.session.resumeSession('store-a'),
    ).resolves.toEqual({
      status: 'order',
      canAddOn: true,
      orderId: 'order-a',
    });
    // The live draft cart stays hydrated for the menu cart bar / cart page, and
    // the order store drives order tracking.
    expect(runtime.stores.cart.getState().cart).toMatchObject({ id: 'cart-a' });
    expect(runtime.stores.order.getState().order).toMatchObject({
      id: 'order-a',
    });
  });

  it('does not clear the active store session when a stale restore runs', async () => {
    saveStoredGuestSession({
      guestToken: 'token-b',
      participantId: 'participant-b',
      storeId: 'store-b',
    });
    const runtime = createStoreFrontRuntime();
    await runtime.commands.tenant.activateStore('store-b');
    await runtime.commands.session.restoreSession('store-b');

    await expect(
      runtime.commands.session.restoreSession('store-a'),
    ).resolves.toEqual({
      status: 'none',
    });
    expect(runtime.stores.session.getState()).toEqual({
      guestToken: 'token-b',
      participantId: 'participant-b',
      storeId: 'store-b',
    });
  });
});
