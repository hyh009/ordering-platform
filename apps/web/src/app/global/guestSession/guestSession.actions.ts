import type { GuestSessionStore } from './guestSession.store';

export function createGuestSessionActions(store: GuestSessionStore) {
  return {
    sessionStarted(input: {
      guestToken: string;
      participantId: string;
      storeId: string;
    }) {
      store.setState({
        guestToken: input.guestToken,
        participantId: input.participantId,
        storeId: input.storeId,
      });
    },

    sessionCleared() {
      store.setState({
        guestToken: null,
        participantId: null,
        storeId: null,
      });
    },
  };
}

export type GuestSessionActions = ReturnType<typeof createGuestSessionActions>;
