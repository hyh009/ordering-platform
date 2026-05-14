import { createStore } from 'zustand/vanilla';
import { setApiTokenProvider } from '@/api';
import type { AuthUser } from '@/models/auth.types';

export type AuthStatus = 'checking' | 'anonymous' | 'authenticated';

export type AuthState = {
  accessToken: string | null;
  status: AuthStatus;
  user: AuthUser | null;
};

export const authStore = createStore<AuthState>(() => ({
  accessToken: null,
  status: 'checking',
  user: null,
}));

setApiTokenProvider(() => authStore.getState().accessToken);
