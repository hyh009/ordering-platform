import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GUEST_ORDER_HISTORY_TTL_MS,
  loadGuestOrderHistory,
  saveGuestOrderHistory,
} from './storage';

describe('guest order history storage', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
  });

  it('keeps stores isolated and prunes expired entries', () => {
    const now = Date.now();
    saveGuestOrderHistory('store-a', [
      {
        storeId: 'store-a',
        orderId: 'fresh',
        guestToken: 'fresh-token',
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + GUEST_ORDER_HISTORY_TTL_MS).toISOString(),
      },
      {
        storeId: 'store-a',
        orderId: 'expired',
        guestToken: 'expired-token',
        createdAt: new Date(now - GUEST_ORDER_HISTORY_TTL_MS).toISOString(),
        expiresAt: new Date(now - 1).toISOString(),
      },
    ]);

    expect(
      loadGuestOrderHistory('store-a', now).map((entry) => entry.orderId),
    ).toEqual(['fresh']);
    expect(loadGuestOrderHistory('store-b', now)).toEqual([]);
  });
});
