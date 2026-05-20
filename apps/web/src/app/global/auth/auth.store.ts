import { createStore } from 'zustand/vanilla';
import type { AuthUserDto } from '@/models/auth.types';

export type AuthStatus = 'checking' | 'anonymous' | 'authenticated';

export type AuthState = {
  accessToken: string | null;
  status: AuthStatus;
  user: AuthUserDto | null;
};

export const authStore = createStore<AuthState>(() => ({
  accessToken: null,
  status: 'checking',
  user: null,
}));
