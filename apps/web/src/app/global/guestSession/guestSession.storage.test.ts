import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearStoredGuestSession,
  loadStoredGuestSession,
  saveStoredGuestSession,
} from './guestSession.storage';

function createLocalStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe('guest session storage', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: createLocalStorage() });
  });

  it('keeps different store sessions isolated', () => {
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

    clearStoredGuestSession('store-a');

    expect(loadStoredGuestSession('store-a')).toBeNull();
    expect(loadStoredGuestSession('store-b')).toEqual({
      guestToken: 'token-b',
      participantId: 'participant-b',
      storeId: 'store-b',
    });
  });

  it('does not read or migrate the legacy unscoped key', () => {
    window.localStorage.setItem(
      'ordering-platform.guestSession',
      JSON.stringify({
        guestToken: 'legacy-token',
        participantId: 'legacy-participant',
        storeId: 'store-a',
      }),
    );

    expect(loadStoredGuestSession('store-a')).toBeNull();
  });
});
