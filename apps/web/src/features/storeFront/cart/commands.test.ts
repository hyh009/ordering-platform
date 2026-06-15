import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGuestSessionStore } from '@/app/global/guestSession/guestSession.store';
import { storeFrontCartService } from '@/services/storeFrontCart.service';
import { createTenantStore } from '../tenant/store';
import { createStoreFrontCartActions } from './actions';
import { createStoreFrontCartCommands } from './commands';
import { createStoreFrontCartStore } from './store';

vi.mock('@/services/storeFrontCart.service', () => ({
  storeFrontCartService: {
    getCart: vi.fn(),
  },
}));

describe('storefront cart commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a token from another store before calling the service', async () => {
    const cartStore = createStoreFrontCartStore();
    const sessionStore = createGuestSessionStore();
    const tenantStore = createTenantStore();
    sessionStore.setState({
      guestToken: 'token-a',
      participantId: 'participant-a',
      storeId: 'store-a',
    });
    tenantStore.setState({ activeStoreId: 'store-b' });
    const commands = createStoreFrontCartCommands({
      cartActions: createStoreFrontCartActions(cartStore),
      sessionStore,
      tenantStore,
    });

    await expect(commands.loadCart('store-b')).resolves.toEqual({
      status: 'failed',
      message: '',
      reason: 'session-store-mismatch',
    });
    expect(storeFrontCartService.getCart).not.toHaveBeenCalled();
    expect(cartStore.getState().isLoading).toBe(false);
  });
});
