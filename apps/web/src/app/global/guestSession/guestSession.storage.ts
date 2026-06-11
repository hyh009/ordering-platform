const STORAGE_KEY_PREFIX = 'ordering-platform.guestSession:';

export type StoredGuestSession = {
  guestToken: string;
  storeId: string;
  participantId: string;
};

function storageKey(storeId: string): string {
  return `${STORAGE_KEY_PREFIX}${storeId}`;
}

export function loadStoredGuestSession(
  storeId: string,
): StoredGuestSession | null {
  try {
    const raw = window.localStorage.getItem(storageKey(storeId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredGuestSession> | null;
    if (
      !parsed ||
      typeof parsed.guestToken !== 'string' ||
      typeof parsed.storeId !== 'string' ||
      typeof parsed.participantId !== 'string' ||
      parsed.storeId !== storeId
    ) {
      return null;
    }

    return {
      guestToken: parsed.guestToken,
      storeId: parsed.storeId,
      participantId: parsed.participantId,
    };
  } catch {
    return null;
  }
}

export function saveStoredGuestSession(session: StoredGuestSession): void {
  try {
    window.localStorage.setItem(
      storageKey(session.storeId),
      JSON.stringify(session),
    );
  } catch {
    // Private mode or storage quota: ordering still works for this tab.
  }
}

export function clearStoredGuestSession(storeId: string): void {
  try {
    window.localStorage.removeItem(storageKey(storeId));
  } catch {
    // Ignore storage failures.
  }
}
