import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGuestSessionStore } from '@/app/global/guestSession/guestSession.store';
import { storeFrontOrderService } from '@/services/storeFrontOrder.service';
import { createTenantStore } from '../tenant/store';
import { createStoreFrontOrderActions } from './actions';
import { createStoreFrontOrderCommands } from './commands';
import { createStoreFrontOrderStore } from './store';

vi.mock('@/services/storeFrontOrder.service', () => ({
  storeFrontOrderService: {
    getOrder: vi.fn(),
  },
}));

describe('storefront order commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not update order state when the route order id does not match', async () => {
    const orderStore = createStoreFrontOrderStore();
    const sessionStore = createGuestSessionStore();
    const tenantStore = createTenantStore();
    sessionStore.setState({
      guestToken: 'token-a',
      participantId: 'participant-a',
      storeId: 'store-a',
    });
    tenantStore.setState({ activeStoreId: 'store-a' });
    vi.mocked(storeFrontOrderService.getOrder).mockResolvedValue({
      id: 'actual-order',
    } as Awaited<ReturnType<typeof storeFrontOrderService.getOrder>>);
    const commands = createStoreFrontOrderCommands({
      orderActions: createStoreFrontOrderActions(orderStore),
      sessionStore,
      tenantStore,
    });

    await expect(
      commands.loadOrder('store-a', 'route-order'),
    ).resolves.toMatchObject({
      status: 'failed',
      reason: 'not-found',
    });
    expect(orderStore.getState().order).toBeNull();
    expect(orderStore.getState().isLoading).toBe(false);
  });

  it('loads a history order with its token without reading or changing session state', async () => {
    const orderStore = createStoreFrontOrderStore();
    const sessionStore = createGuestSessionStore();
    const tenantStore = createTenantStore();
    sessionStore.setState({
      guestToken: 'active-token',
      participantId: 'active-participant',
      storeId: 'store-a',
    });
    tenantStore.setState({ activeStoreId: 'store-a' });
    vi.mocked(storeFrontOrderService.getOrder).mockResolvedValue({
      id: 'history-order',
      storeId: 'store-a',
    } as Awaited<ReturnType<typeof storeFrontOrderService.getOrder>>);
    const commands = createStoreFrontOrderCommands({
      orderActions: createStoreFrontOrderActions(orderStore),
      sessionStore,
      tenantStore,
    });

    await expect(
      commands.loadOrderWithToken('store-a', 'history-order', 'history-token'),
    ).resolves.toEqual({ status: 'loaded' });
    expect(storeFrontOrderService.getOrder).toHaveBeenCalledWith('history-token');
    expect(sessionStore.getState()).toEqual({
      guestToken: 'active-token',
      participantId: 'active-participant',
      storeId: 'store-a',
    });
  });

  it('finishes loading when a history token resolves to another order', async () => {
    const orderStore = createStoreFrontOrderStore();
    const sessionStore = createGuestSessionStore();
    const tenantStore = createTenantStore();
    tenantStore.setState({ activeStoreId: 'store-a' });
    vi.mocked(storeFrontOrderService.getOrder).mockResolvedValue({
      id: 'another-order',
      storeId: 'store-a',
    } as Awaited<ReturnType<typeof storeFrontOrderService.getOrder>>);
    const commands = createStoreFrontOrderCommands({
      orderActions: createStoreFrontOrderActions(orderStore),
      sessionStore,
      tenantStore,
    });

    await expect(
      commands.loadOrderWithToken('store-a', 'route-order', 'history-token'),
    ).resolves.toMatchObject({
      status: 'failed',
      reason: 'not-found',
    });
    expect(orderStore.getState().isLoading).toBe(false);
  });
});
