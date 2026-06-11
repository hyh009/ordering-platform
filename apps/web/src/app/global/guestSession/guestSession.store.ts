import { createStore } from 'zustand/vanilla';

export type GuestSessionState = {
  guestToken: string | null;
  participantId: string | null;
  storeId: string | null;
};

export function createGuestSessionStore() {
  return createStore<GuestSessionState>(() => ({
    guestToken: null,
    participantId: null,
    storeId: null,
  }));
}

export type GuestSessionStore = ReturnType<typeof createGuestSessionStore>;
