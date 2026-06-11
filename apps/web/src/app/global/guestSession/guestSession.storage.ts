const STORAGE_KEY = 'ordering-platform.guestSession';

export type StoredGuestSession = {
  guestToken: string;
  storeId: string;
  participantId: string;
};

export function loadStoredGuestSession(): StoredGuestSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredGuestSession> | null;
    if (
      !parsed ||
      typeof parsed.guestToken !== 'string' ||
      typeof parsed.storeId !== 'string' ||
      typeof parsed.participantId !== 'string'
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Private mode or storage quota: ordering still works for this tab.
  }
}

export function clearStoredGuestSession(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}
