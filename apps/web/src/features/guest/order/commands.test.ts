import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGuestSessionStore } from '@/app/global/guestSession/guestSession.store';
import { guestOrderService } from '@/services/guestOrder.service';
import { createGuestTenantStore } from '../tenant/store';
import { createGuestOrderActions } from './actions';
import { createGuestOrderCommands } from './commands';
import { createGuestOrderStore } from './store';

vi.mock('@/services/guestOrder.service', () => ({
  guestOrderService: {
    getOrder: vi.fn(),
  },
}));

describe('guest order commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not update order state when the route order id does not match', async () => {
    const orderStore = createGuestOrderStore();
    const sessionStore = createGuestSessionStore();
    const tenantStore = createGuestTenantStore();
    sessionStore.setState({
      guestToken: 'token-a',
      participantId: 'participant-a',
      storeId: 'store-a',
    });
    tenantStore.setState({ activeStoreId: 'store-a' });
    vi.mocked(guestOrderService.getOrder).mockResolvedValue({
      id: 'actual-order',
    } as Awaited<ReturnType<typeof guestOrderService.getOrder>>);
    const commands = createGuestOrderCommands({
      orderActions: createGuestOrderActions(orderStore),
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
  });
});
