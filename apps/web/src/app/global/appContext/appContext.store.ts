import { createStore } from 'zustand/vanilla';

export type AppContextState = {
  appName: string;
};

export const appContextStore = createStore<AppContextState>(() => ({
  appName: 'Ordering Platform',
}));
