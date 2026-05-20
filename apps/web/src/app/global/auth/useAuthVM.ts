import { useCallback } from 'react';
import { useStore } from 'zustand';
import { authCommands } from '@/app/global/auth/auth.commands';
import { authStore } from '@/app/global/auth/auth.store';

type UseAuthVMOptions = {
  onLoggedOut?: () => void;
};

export function useAuthVM(options: UseAuthVMOptions = {}) {
  const status = useStore(authStore, (state) => state.status);
  const user = useStore(authStore, (state) => state.user);
  const { onLoggedOut } = options;

  const initialize = useCallback(function initialize() {
    return authCommands.initialize();
  }, []);

  const logout = useCallback(
    async function logout() {
      const result = await authCommands.logout();

      if (result.status === 'logged-out') {
        onLoggedOut?.();
      }
    },
    [onLoggedOut],
  );

  return {
    initialize,
    isAuthenticated: status === 'authenticated',
    isChecking: status === 'checking',
    logout,
    status,
    user,
  };
}
