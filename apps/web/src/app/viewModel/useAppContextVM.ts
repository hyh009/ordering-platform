import { useStore } from 'zustand';
import { appContextStore } from '../stores/appContext.store';

export function useAppContextVM() {
  const appName = useStore(appContextStore, (state) => state.appName);

  return {
    appName,
  };
}
