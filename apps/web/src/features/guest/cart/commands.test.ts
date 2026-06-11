import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGuestSessionStore } from '@/app/global/guestSession/guestSession.store';
import { guestCartService } from '@/services/guestCart.service';
import { createGuestTenantStore } from '../tenant/store';
import { createGuestCartActions } from './actions';
import { createGuestCartCommands } from './commands';
import { createGuestCartStore } from './store';

vi.mock('@/services/guestCart.service', () => ({
  guestCartService: {
    getCart: vi.fn(),
  },
}));

describe('guest cart commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a token from another store before calling the service', async () => {
    const cartStore = createGuestCartStore();
    const sessionStore = createGuestSessionStore();
    const tenantStore = createGuestTenantStore();
    sessionStore.setState({
      guestToken: 'token-a',
      participantId: 'participant-a',
      storeId: 'store-a',
    });
    tenantStore.setState({ activeStoreId: 'store-b' });
    const commands = createGuestCartCommands({
      cartActions: createGuestCartActions(cartStore),
      sessionStore,
      tenantStore,
    });

    await expect(commands.loadCart('store-b')).resolves.toEqual({
      status: 'failed',
      message: '',
      reason: 'session-store-mismatch',
    });
    expect(guestCartService.getCart).not.toHaveBeenCalled();
    expect(cartStore.getState().isLoading).toBe(false);
  });
});
