import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/apiError';
import type { Order } from '@/models/order';
import { guestOrderService } from '@/services/guestOrder.service';
import { createGuestTenantStore } from '../tenant/store';
import { createGuestOrderHistoryActions } from './actions';
import { createGuestOrderHistoryCommands } from './commands';
import { createGuestOrderHistoryStore } from './store';

vi.mock('@/services/guestOrder.service', () => ({
  guestOrderService: {
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

describe('guest order history commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', { localStorage: createLocalStorage() });
  });

  it('records only for the active store and finds entries by route order id', () => {
    const store = createGuestOrderHistoryStore();
    const tenantStore = createGuestTenantStore();
    tenantStore.setState({ activeStoreId: 'store-a' });
    const commands = createGuestOrderHistoryCommands({
      actions: createGuestOrderHistoryActions(store),
      tenantStore,
    });
    const order = {
      id: 'order-a',
      storeId: 'store-a',
      createdAt: new Date().toISOString(),
    } as Order;

    commands.recordOrder('store-b', order, 'token-b');
    commands.recordOrder('store-a', order, 'token-a');

    expect(commands.findEntry('store-b', 'order-a')).toBeNull();
    expect(commands.findEntry('store-a', 'order-a')).toMatchObject({
      storeId: 'store-a',
      orderId: 'order-a',
      guestToken: 'token-a',
    });
  });

  it('removes expired entries while keeping accessible orders in the list store', async () => {
    const store = createGuestOrderHistoryStore();
    const tenantStore = createGuestTenantStore();
    tenantStore.setState({ activeStoreId: 'store-a' });
    const commands = createGuestOrderHistoryCommands({
      actions: createGuestOrderHistoryActions(store),
      tenantStore,
    });
    const createdAt = new Date().toISOString();
    const expiredOrder = {
      id: 'expired-order',
      storeId: 'store-a',
      createdAt,
    } as Order;
    const validOrder = {
      id: 'valid-order',
      storeId: 'store-a',
      createdAt,
    } as Order;
    commands.recordOrder('store-a', expiredOrder, 'expired-token');
    commands.recordOrder('store-a', validOrder, 'valid-token');
    vi.mocked(guestOrderService.getOrder).mockImplementation((token) => {
      if (token === 'expired-token') {
        return Promise.reject(
          new ApiError({
            code: 'INVALID_GUEST_TOKEN',
            message: 'expired',
            statusCode: 401,
          }),
        );
      }
      return Promise.resolve(validOrder);
    });

    await expect(commands.loadOrders('store-a')).resolves.toEqual({
      status: 'loaded',
    });
    expect(commands.findEntry('store-a', 'expired-order')).toBeNull();
    expect(store.getState().items.map((item) => item.order.id)).toEqual([
      'valid-order',
    ]);
  });
});
