import type { GuestSessionActions } from './guestSession.actions';
import {
  clearStoredGuestSession,
  saveStoredGuestSession,
  type StoredGuestSession,
} from './guestSession.storage';

export type GuestSessionCommands = {
  startSession(session: StoredGuestSession): void;
  clearSession(): void;
};

export function createGuestSessionCommands(
  actions: GuestSessionActions,
): GuestSessionCommands {
  return {
    startSession(session) {
      saveStoredGuestSession(session);
      actions.sessionStarted(session);
    },

    clearSession() {
      clearStoredGuestSession();
      actions.sessionCleared();
    },
  };
}
