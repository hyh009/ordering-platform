import type { StoreFrontOrderHistoryEntry } from './types';

const STORAGE_KEY_PREFIX = 'ordering-platform.storeFrontOrderHistory:';
export const STOREFRONT_ORDER_HISTORY_TTL_MS = 24 * 60 * 60 * 1000;

function storageKey(storeId: string): string {
  return `${STORAGE_KEY_PREFIX}${storeId}`;
}

function isEntry(
  value: unknown,
  storeId: string,
): value is StoreFrontOrderHistoryEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<StoreFrontOrderHistoryEntry>;
  return (
    entry.storeId === storeId &&
    typeof entry.orderId === 'string' &&
    typeof entry.guestToken === 'string' &&
    typeof entry.createdAt === 'string' &&
    typeof entry.expiresAt === 'string'
  );
}

export function loadStoreFrontOrderHistory(
  storeId: string,
  now = Date.now(),
): StoreFrontOrderHistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(storageKey(storeId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const entries = parsed
      .filter((entry): entry is StoreFrontOrderHistoryEntry =>
        isEntry(entry, storeId),
      )
      .filter((entry) => Date.parse(entry.expiresAt) > now);

    if (entries.length !== parsed.length) {
      saveStoreFrontOrderHistory(storeId, entries);
    }
    return entries;
  } catch {
    return [];
  }
}

export function saveStoreFrontOrderHistory(
  storeId: string,
  entries: StoreFrontOrderHistoryEntry[],
): void {
  try {
    if (entries.length === 0) {
      window.localStorage.removeItem(storageKey(storeId));
      return;
    }
    window.localStorage.setItem(storageKey(storeId), JSON.stringify(entries));
  } catch {
    // Ordering and tracking still work when local persistence is unavailable.
  }
}
