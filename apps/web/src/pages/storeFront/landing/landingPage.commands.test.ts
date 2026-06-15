import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStoreFrontRuntime } from '@/features/storeFront/runtime';
import type { Cart, GuestSession } from '@/models/cart';
import type { Order } from '@/models/order';
import { storeFrontCartService } from '@/services/storeFrontCart.service';
import { createLandingPageCommands } from './landingPage.commands';

vi.mock('@/services/storeFrontCart.service', () => ({
  storeFrontCartService: {
    getSession: vi.fn(),
    leaveCart: vi.fn(),
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

describe('landing page commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', { localStorage: createLocalStorage() });
    seedSession();
  });

  it('leaves an active cart before replacing the session', async () => {
    const runtime = createStoreFrontRuntime();
    vi.mocked(storeFrontCartService.getSession).mockResolvedValue({
      participantId: 'participant-a',
      cart: { id: 'cart-a', status: 'active' } as Cart,
    } satisfies GuestSession);
    vi.mocked(storeFrontCartService.leaveCart).mockResolvedValue('cart-a');

    await expect(
      createLandingPageCommands(runtime).abandonCurrentSession('store-a'),
    ).resolves.toEqual({ status: 'left' });
    expect(storeFrontCartService.leaveCart).toHaveBeenCalledWith('token-a');
    expect(runtime.commands.session.hasStoredSession('store-a')).toBe(false);
  });

  it('clears an active order session without leaving the checked-out cart', async () => {
    const runtime = createStoreFrontRuntime();
    vi.mocked(storeFrontCartService.getSession).mockResolvedValue({
      participantId: 'participant-a',
      order: { id: 'order-a', storeId: 'store-a' } as Order,
    } satisfies GuestSession);

    await expect(
      createLandingPageCommands(runtime).abandonCurrentSession('store-a'),
    ).resolves.toEqual({ status: 'left' });
    expect(storeFrontCartService.leaveCart).not.toHaveBeenCalled();
    expect(runtime.commands.session.hasStoredSession('store-a')).toBe(false);
  });
});
