import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadStoredGuestSession } from '@/app/global/guestSession/guestSession.storage';
import { createStoreFrontRuntime } from '../runtime';

function createLocalStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe('storefront tenant workflow', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: createLocalStorage() });
  });

  it('resets active in-memory state without deleting another store session', async () => {
    const runtime = createStoreFrontRuntime();
    runtime.commands.session.clearSession('store-a');
    runtime.stores.storefront.setState({ error: 'old', isLoading: true });
    runtime.stores.cart.setState({ error: 'old', isLoading: true });
    runtime.stores.order.setState({ error: 'old', isLoading: true });

    const session = {
      guestToken: 'token-a',
      participantId: 'participant-a',
      storeId: 'store-a',
    };
    window.localStorage.setItem(
      'ordering-platform.guestSession:store-a',
      JSON.stringify(session),
    );
    runtime.stores.session.setState(session);
    runtime.stores.tenant.setState({ activeStoreId: 'store-a' });

    await runtime.commands.tenant.activateStore('store-b');

    expect(runtime.stores.tenant.getState().activeStoreId).toBe('store-b');
    expect(runtime.stores.session.getState().guestToken).toBeNull();
    expect(runtime.stores.storefront.getState()).toMatchObject({
      error: null,
      isLoading: false,
      menu: null,
      store: null,
    });
    expect(runtime.stores.cart.getState().cart).toBeNull();
    expect(runtime.stores.order.getState().order).toBeNull();
    expect(loadStoredGuestSession('store-a')).toEqual(session);
  });
});
