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
    // `loadOrder` does not write `loadFailed` — the page VM does that via
    // `reportActiveLoadFailure` after routing through `handleStorefrontLoadFailure`.
    // The store's `order` slot is never polluted with a mismatched order.
    expect(orderStore.getState().order).toBeNull();
  });

  it('fetches a history order with its token without reading or changing session state', async () => {
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

    // fetchOrderWithToken returns the order in the result (not via the store)
    // so the page VM can hold it in page-local state.
    const result = await commands.fetchOrderWithToken(
      'store-a',
      'history-order',
      'history-token',
    );
    expect(result).toMatchObject({ status: 'loaded' });
    expect(storeFrontOrderService.getOrder).toHaveBeenCalledWith(
      'history-token',
    );
    // Session state is untouched.
    expect(sessionStore.getState()).toEqual({
      guestToken: 'active-token',
      participantId: 'active-participant',
      storeId: 'store-a',
    });
    // The shared order store is never written — the returned order goes into
    // page-local historyView in the VM.
    expect(orderStore.getState().order).toBeNull();
  });

  it('returns not-found when a history token resolves to another order', async () => {
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
      commands.fetchOrderWithToken('store-a', 'route-order', 'history-token'),
    ).resolves.toMatchObject({
      status: 'failed',
      reason: 'not-found',
    });
    // fetchOrderWithToken never touches the store, so isLoading stays false.
    expect(orderStore.getState().isLoading).toBe(false);
  });
});
