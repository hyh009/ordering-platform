import type { GuestSessionActions } from './guestSession.actions';
import type { GuestSessionStore } from './guestSession.store';
import {
  clearStoredGuestSession,
  loadStoredGuestSession,
  saveStoredGuestSession,
  type StoredGuestSession,
} from './guestSession.storage';

export type GuestSessionCommands = {
  startSession(session: StoredGuestSession): void;
  hasStoredSession(storeId: string): boolean;
  restoreStoredSession(storeId: string): StoredGuestSession | null;
  deactivateSession(): void;
  clearSession(storeId: string): void;
};

export function createGuestSessionCommands(
  actions: GuestSessionActions,
  store: GuestSessionStore,
): GuestSessionCommands {
  return {
    startSession(session) {
      saveStoredGuestSession(session);
      actions.sessionStarted(session);
    },

    hasStoredSession(storeId) {
      return loadStoredGuestSession(storeId) !== null;
    },

    restoreStoredSession(storeId) {
      const stored = loadStoredGuestSession(storeId);
      if (stored) {
        actions.sessionStarted(stored);
      } else {
        actions.sessionCleared();
      }
      return stored;
    },

    deactivateSession() {
      actions.sessionCleared();
    },

    clearSession(storeId) {
      clearStoredGuestSession(storeId);
      if (store.getState().storeId === storeId) {
        actions.sessionCleared();
      }
    },
  };
}
