import type { AuthSession } from '@/models/auth';
import type { AuthState } from '@/app/global/auth/auth.store';
import type { StoreApi } from 'zustand/vanilla';

export function createAuthActions(authStore: StoreApi<AuthState>) {
  return {
    authChecking() {
      authStore.setState({
        status: 'checking',
      });
    },

    authSuccess(session: AuthSession) {
      authStore.setState({
        accessToken: session.accessToken,
        status: 'authenticated',
        user: session.user,
      });
    },

    authAnonymous() {
      authStore.setState({
        accessToken: null,
        status: 'anonymous',
        user: null,
      });
    },
  };
}

export type AuthActions = ReturnType<typeof createAuthActions>;
