import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/apiError';
import { createStoreFrontRuntime } from '@/features/storeFront/runtime';
import { loadStoreFrontOrderHistory } from '@/features/storeFront/orderHistory/storage';
import {
  loadStoredGuestSession,
  saveStoredGuestSession,
} from '@/app/global/guestSession/guestSession.storage';
import type { Order } from '@/models/order';
import { storeFrontOrderService } from '@/services/storeFrontOrder.service';
import { createOrderTrackingPageCommands } from './orderTrackingPage.commands';

vi.mock('@/services/storeFrontOrder.service', () => ({
  storeFrontOrderService: {
    getOrder: vi.fn(),
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

describe('order tracking page commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', { localStorage: createLocalStorage() });
  });

  it('loads a matching history entry without restoring or clearing the active session', async () => {
    const runtime = createStoreFrontRuntime();
    await runtime.commands.tenant.activateStore('store-a');
    runtime.stores.session.setState({
      guestToken: 'active-token',
      participantId: 'active-participant',
      storeId: 'store-a',
    });
    runtime.commands.orderHistory.recordOrder(
      'store-a',
      {
        id: 'history-order',
        storeId: 'store-a',
        createdAt: new Date().toISOString(),
      } as Order,
      'history-token',
    );
    vi.mocked(storeFrontOrderService.getOrder).mockResolvedValue({
      id: 'history-order',
      storeId: 'store-a',
    } as Awaited<ReturnType<typeof storeFrontOrderService.getOrder>>);

    const result = await createOrderTrackingPageCommands(runtime).initialize(
      'store-a',
      'history-order',
    );

    // The result now includes the fetched order so the VM can hold it in
    // page-local historyView state (no shared store write).
    expect(result).toMatchObject({ status: 'loaded', access: 'history' });
    expect(result).toHaveProperty('order');
    expect(storeFrontOrderService.getOrder).toHaveBeenCalledWith(
      'history-token',
    );
    expect(runtime.stores.session.getState()).toEqual({
      guestToken: 'active-token',
      participantId: 'active-participant',
      storeId: 'store-a',
    });
  });

  it('records the order into local history when loaded via the active session', async () => {
    const runtime = createStoreFrontRuntime();
    await runtime.commands.tenant.activateStore('store-a');
    saveStoredGuestSession({
      guestToken: 'active-token',
      participantId: 'active-participant',
      storeId: 'store-a',
    });
    vi.mocked(storeFrontOrderService.getOrder).mockResolvedValue({
      id: 'active-order',
      storeId: 'store-a',
      createdAt: new Date().toISOString(),
    } as Awaited<ReturnType<typeof storeFrontOrderService.getOrder>>);

    expect(runtime.commands.orderHistory.hasHistory('store-a')).toBe(false);

    const result = await createOrderTrackingPageCommands(runtime).initialize(
      'store-a',
      'active-order',
    );

    expect(result).toMatchObject({ status: 'loaded', access: 'active' });
    const entry = runtime.commands.orderHistory.findEntry(
      'store-a',
      'active-order',
    );
    expect(entry).toMatchObject({
      orderId: 'active-order',
      guestToken: 'active-token',
    });
  });

  it('does not double-record an order already loaded via a history entry', async () => {
    const runtime = createStoreFrontRuntime();
    await runtime.commands.tenant.activateStore('store-a');
    runtime.stores.session.setState({
      guestToken: 'active-token',
      participantId: 'active-participant',
      storeId: 'store-a',
    });
    runtime.commands.orderHistory.recordOrder(
      'store-a',
      {
        id: 'history-order',
        storeId: 'store-a',
        createdAt: new Date().toISOString(),
      } as Order,
      'history-token',
    );
    vi.mocked(storeFrontOrderService.getOrder).mockResolvedValue({
      id: 'history-order',
      storeId: 'store-a',
    } as Awaited<ReturnType<typeof storeFrontOrderService.getOrder>>);

    const result = await createOrderTrackingPageCommands(runtime).initialize(
      'store-a',
      'history-order',
    );

    // The result now includes the fetched order (returned to the VM for
    // page-local historyView, not written to the shared order store).
    expect(result).toMatchObject({ status: 'loaded', access: 'history' });
    expect(result).toHaveProperty('order');
    // The history entry retains its original token; the active path never ran,
    // so it was not overwritten with the active session token.
    expect(
      runtime.commands.orderHistory.findEntry('store-a', 'history-order'),
    ).toMatchObject({ guestToken: 'history-token' });
  });

  it('dedups history entries across repeated active loads', async () => {
    const runtime = createStoreFrontRuntime();
    await runtime.commands.tenant.activateStore('store-a');
    saveStoredGuestSession({
      guestToken: 'active-token',
      participantId: 'active-participant',
      storeId: 'store-a',
    });
    vi.mocked(storeFrontOrderService.getOrder).mockResolvedValue({
      id: 'active-order',
      storeId: 'store-a',
      createdAt: new Date().toISOString(),
    } as Awaited<ReturnType<typeof storeFrontOrderService.getOrder>>);

    const commands = createOrderTrackingPageCommands(runtime);
    await commands.initialize('store-a', 'active-order');
    await commands.initialize('store-a', 'active-order');

    expect(loadStoreFrontOrderHistory('store-a')).toHaveLength(1);
  });

  it('refreshes a history order with the stored history token', async () => {
    const runtime = createStoreFrontRuntime();
    await runtime.commands.tenant.activateStore('store-a');
    runtime.commands.orderHistory.recordOrder(
      'store-a',
      {
        id: 'history-order',
        storeId: 'store-a',
        createdAt: new Date().toISOString(),
      } as Order,
      'history-token',
    );
    const order = {
      id: 'history-order',
      storeId: 'store-a',
      createdAt: new Date().toISOString(),
    } as Awaited<ReturnType<typeof storeFrontOrderService.getOrder>>;
    vi.mocked(storeFrontOrderService.getOrder).mockResolvedValue(order);

    await expect(
      createOrderTrackingPageCommands(runtime).refresh(
        'store-a',
        'history-order',
        'history',
      ),
    ).resolves.toEqual({ status: 'loaded', order });
    expect(storeFrontOrderService.getOrder).toHaveBeenCalledWith(
      'history-token',
    );
  });

  it('redirects to recent orders when refreshing history access without an entry', async () => {
    const runtime = createStoreFrontRuntime();
    await runtime.commands.tenant.activateStore('store-a');

    await expect(
      createOrderTrackingPageCommands(runtime).refresh(
        'store-a',
        'missing-order',
        'history',
      ),
    ).resolves.toEqual({ status: 'redirect', target: 'history' });
    expect(storeFrontOrderService.getOrder).not.toHaveBeenCalled();
  });

  it('clears the active session and redirects landing when the token is expired', async () => {
    const runtime = createStoreFrontRuntime();
    await runtime.commands.tenant.activateStore('store-a');
    saveStoredGuestSession({
      guestToken: 'active-token',
      participantId: 'active-participant',
      storeId: 'store-a',
    });
    vi.mocked(storeFrontOrderService.getOrder).mockRejectedValue(
      new ApiError({
        code: 'INVALID_GUEST_TOKEN',
        message: 'expired',
        statusCode: 401,
      }),
    );

    await expect(
      createOrderTrackingPageCommands(runtime).initialize(
        'store-a',
        'active-order',
      ),
    ).resolves.toEqual({ status: 'redirect', target: 'landing' });
    expect(loadStoredGuestSession('store-a')).toBeNull();
  });

  it('redirects landing without clearing the route session on a store mismatch race', async () => {
    const runtime = createStoreFrontRuntime();
    await runtime.commands.tenant.activateStore('store-a');
    saveStoredGuestSession({
      guestToken: 'active-token',
      participantId: 'active-participant',
      storeId: 'store-a',
    });
    vi.mocked(storeFrontOrderService.getOrder).mockImplementation(async () => {
      await runtime.commands.tenant.activateStore('store-b');
      return {
        id: 'active-order',
        storeId: 'store-a',
        createdAt: new Date().toISOString(),
      } as Awaited<ReturnType<typeof storeFrontOrderService.getOrder>>;
    });

    await expect(
      createOrderTrackingPageCommands(runtime).initialize(
        'store-a',
        'active-order',
      ),
    ).resolves.toEqual({ status: 'redirect', target: 'landing' });
    expect(loadStoredGuestSession('store-a')).toMatchObject({
      guestToken: 'active-token',
    });
  });
});
