import type { GuestOrderHistoryEntry } from './types';

const STORAGE_KEY_PREFIX = 'ordering-platform.guestOrderHistory:';
export const GUEST_ORDER_HISTORY_TTL_MS = 24 * 60 * 60 * 1000;

function storageKey(storeId: string): string {
  return `${STORAGE_KEY_PREFIX}${storeId}`;
}

function isEntry(
  value: unknown,
  storeId: string,
): value is GuestOrderHistoryEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<GuestOrderHistoryEntry>;
  return (
    entry.storeId === storeId &&
    typeof entry.orderId === 'string' &&
    typeof entry.guestToken === 'string' &&
    typeof entry.createdAt === 'string' &&
    typeof entry.expiresAt === 'string'
  );
}

export function loadGuestOrderHistory(
  storeId: string,
  now = Date.now(),
): GuestOrderHistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(storageKey(storeId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const entries = parsed
      .filter((entry): entry is GuestOrderHistoryEntry =>
        isEntry(entry, storeId),
      )
      .filter((entry) => Date.parse(entry.expiresAt) > now);

    if (entries.length !== parsed.length) {
      saveGuestOrderHistory(storeId, entries);
    }
    return entries;
  } catch {
    return [];
  }
}

export function saveGuestOrderHistory(
  storeId: string,
  entries: GuestOrderHistoryEntry[],
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
