import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/apiError';
import {
  loadStoredGuestSession,
  saveStoredGuestSession,
} from '@/app/global/guestSession/guestSession.storage';
import { guestCartService } from '@/services/guestCart.service';
import { createGuestRuntime } from '../runtime';

vi.mock('@/services/guestCart.service', () => ({
  guestCartService: {
    getSession: vi.fn(),
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

describe('guest session workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', { localStorage: createLocalStorage() });
  });

  it('validates lazily on resume and clears only the expired store', async () => {
    saveStoredGuestSession({
      guestToken: 'token-a',
      participantId: 'participant-a',
      storeId: 'store-a',
    });
    saveStoredGuestSession({
      guestToken: 'token-b',
      participantId: 'participant-b',
      storeId: 'store-b',
    });
    const runtime = createGuestRuntime();
    await runtime.commands.tenant.activateStore('store-a');

    await expect(
      runtime.commands.session.restoreSession('store-a'),
    ).resolves.toEqual({
      status: 'restored',
      session: {
        guestToken: 'token-a',
        participantId: 'participant-a',
        storeId: 'store-a',
      },
    });
    expect(guestCartService.getSession).not.toHaveBeenCalled();

    vi.mocked(guestCartService.getSession).mockRejectedValue(
      new ApiError({
        code: 'INVALID_GUEST_TOKEN',
        message: 'Invalid guest token.',
        statusCode: 401,
      }),
    );

    await expect(
      runtime.commands.session.resumeSession('store-a'),
    ).resolves.toEqual({
      status: 'ended',
    });
    expect(loadStoredGuestSession('store-a')).toBeNull();
    expect(loadStoredGuestSession('store-b')).not.toBeNull();
  });

  it('does not clear the active store session when a stale restore runs', async () => {
    saveStoredGuestSession({
      guestToken: 'token-b',
      participantId: 'participant-b',
      storeId: 'store-b',
    });
    const runtime = createGuestRuntime();
    await runtime.commands.tenant.activateStore('store-b');
    await runtime.commands.session.restoreSession('store-b');

    await expect(
      runtime.commands.session.restoreSession('store-a'),
    ).resolves.toEqual({
      status: 'none',
    });
    expect(runtime.stores.session.getState()).toEqual({
      guestToken: 'token-b',
      participantId: 'participant-b',
      storeId: 'store-b',
    });
  });
});
