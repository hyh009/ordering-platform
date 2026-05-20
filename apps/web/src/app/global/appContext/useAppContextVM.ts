import { useStore } from 'zustand';
import { appContextStore } from './appContext.store';

export function useAppContextVM() {
  const appName = useStore(appContextStore, (state) => state.appName);

  return {
    appName,
  };
}
