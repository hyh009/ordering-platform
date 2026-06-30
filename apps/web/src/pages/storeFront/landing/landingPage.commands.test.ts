import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStoreFrontRuntime } from '@/features/storeFront/runtime';
import type { Cart, GuestSession } from '@/models/cart';
import type { Order } from '@/models/order';
import { storeFrontCartService } from '@/services/storeFrontCart.service';
import { storeFrontMenuService } from '@/services/storeFrontMenu.service';
import { createLandingPageCommands } from './landingPage.commands';

vi.mock('@/services/storeFrontCart.service', () => ({
  storeFrontCartService: {
    getSession: vi.fn(),
    leaveCart: vi.fn(),
  },
}));

vi.mock('@/services/storeFrontMenu.service', () => ({
  storeFrontMenuService: {
    getStore: vi.fn(),
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
    vi.mocked(storeFrontMenuService.getStore).mockResolvedValue({
      id: 'store-a',
      orderModes: [],
    } as never);
    seedSession();
  });

  it('does not offer resume on initialize when the stored order is finished', async () => {
    const runtime = createStoreFrontRuntime();
    vi.mocked(storeFrontCartService.getSession).mockResolvedValue({
      participantId: 'participant-a',
      order: {
        id: 'order-a',
        storeId: 'store-a',
        status: 'completed',
        canAddOn: false,
      } as Order,
    } satisfies GuestSession);

    await expect(
      createLandingPageCommands(runtime).initialize('store-a'),
    ).resolves.toMatchObject({
      hasStoredSession: false,
    });
    expect(runtime.commands.session.hasStoredSession('store-a')).toBe(false);
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

  it('blocks abandoning an unfinished order so the guest resumes it', async () => {
    const runtime = createStoreFrontRuntime();
    vi.mocked(storeFrontCartService.getSession).mockResolvedValue({
      participantId: 'participant-a',
      order: {
        id: 'order-a',
        storeId: 'store-a',
        status: 'preparing',
      } as Order,
    } satisfies GuestSession);

    await expect(
      createLandingPageCommands(runtime).abandonCurrentSession('store-a'),
    ).resolves.toEqual({ status: 'blocked', orderId: 'order-a' });
    expect(storeFrontCartService.leaveCart).not.toHaveBeenCalled();
    // The order is a live obligation, so its session is kept for resuming.
    expect(runtime.commands.session.hasStoredSession('store-a')).toBe(true);
  });

  it('clears a finished order session without leaving the checked-out cart', async () => {
    const runtime = createStoreFrontRuntime();
    vi.mocked(storeFrontCartService.getSession).mockResolvedValue({
      participantId: 'participant-a',
      order: {
        id: 'order-a',
        storeId: 'store-a',
        status: 'completed',
      } as Order,
    } satisfies GuestSession);

    await expect(
      createLandingPageCommands(runtime).abandonCurrentSession('store-a'),
    ).resolves.toEqual({ status: 'left' });
    expect(storeFrontCartService.leaveCart).not.toHaveBeenCalled();
    expect(runtime.commands.session.hasStoredSession('store-a')).toBe(false);
  });

  it('currentOrderIsOpen is true while unfinished and false once finished', async () => {
    const runtime = createStoreFrontRuntime();
    const commands = createLandingPageCommands(runtime);

    vi.mocked(storeFrontCartService.getSession).mockResolvedValue({
      participantId: 'participant-a',
      order: {
        id: 'order-a',
        storeId: 'store-a',
        status: 'preparing',
      } as Order,
    } satisfies GuestSession);
    await expect(commands.currentOrderIsOpen('store-a')).resolves.toBe(true);

    vi.mocked(storeFrontCartService.getSession).mockResolvedValue({
      participantId: 'participant-a',
      order: {
        id: 'order-a',
        storeId: 'store-a',
        status: 'completed',
      } as Order,
    } satisfies GuestSession);
    await expect(commands.currentOrderIsOpen('store-a')).resolves.toBe(false);
  });

  it('currentOrderIsOpen is false for an active cart', async () => {
    const runtime = createStoreFrontRuntime();
    vi.mocked(storeFrontCartService.getSession).mockResolvedValue({
      participantId: 'participant-a',
      cart: { id: 'cart-a', status: 'active' } as Cart,
    } satisfies GuestSession);

    await expect(
      createLandingPageCommands(runtime).currentOrderIsOpen('store-a'),
    ).resolves.toBe(false);
  });
});
