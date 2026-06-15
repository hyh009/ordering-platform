import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/apiError';
import type { Order } from '@/models/order';
import { storeFrontOrderService } from '@/services/storeFrontOrder.service';
import { createTenantStore } from '../tenant/store';
import { createStoreFrontOrderHistoryActions } from './actions';
import { createStoreFrontOrderHistoryCommands } from './commands';
import { createStoreFrontOrderHistoryStore } from './store';

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

describe('storefront order history commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', { localStorage: createLocalStorage() });
  });

  it('records only for the active store and finds entries by route order id', () => {
    const store = createStoreFrontOrderHistoryStore();
    const tenantStore = createTenantStore();
    tenantStore.setState({ activeStoreId: 'store-a' });
    const commands = createStoreFrontOrderHistoryCommands({
      actions: createStoreFrontOrderHistoryActions(store),
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
    const store = createStoreFrontOrderHistoryStore();
    const tenantStore = createTenantStore();
    tenantStore.setState({ activeStoreId: 'store-a' });
    const commands = createStoreFrontOrderHistoryCommands({
      actions: createStoreFrontOrderHistoryActions(store),
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
    vi.mocked(storeFrontOrderService.getOrder).mockImplementation((token) => {
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
