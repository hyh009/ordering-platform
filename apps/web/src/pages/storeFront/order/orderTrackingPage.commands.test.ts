import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStoreFrontRuntime } from '@/features/storeFront/runtime';
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

    expect(result).toEqual({ status: 'loaded', access: 'history' });
    expect(storeFrontOrderService.getOrder).toHaveBeenCalledWith('history-token');
    expect(runtime.stores.session.getState()).toEqual({
      guestToken: 'active-token',
      participantId: 'active-participant',
      storeId: 'store-a',
    });
  });
});
