import { createStoreListActions } from './actions';
import { createStoreListStore } from './store';

export function createStoreListRuntime() {
  const storeInstance = createStoreListStore();
  const actions = createStoreListActions(storeInstance);

  return { storeInstance, actions };
}

export type StoreListRuntime = ReturnType<typeof createStoreListRuntime>;
export type StoreListActions = ReturnType<typeof createStoreListActions>;
