import { createStoreSettingsActions } from './actions';
import { createStoreSettingsStore } from './store';

export function createStoreSettingsRuntime() {
  const storeInstance = createStoreSettingsStore();
  const actions = createStoreSettingsActions(storeInstance);

  return { storeInstance, actions };
}

export type StoreSettingsRuntime = ReturnType<typeof createStoreSettingsRuntime>;
export type StoreSettingsActions = ReturnType<typeof createStoreSettingsActions>;
