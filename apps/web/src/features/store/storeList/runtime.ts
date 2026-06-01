import { createStoreListActions } from './actions';
import { createStoreListCommands } from './commands';
import { createStoreListStore } from './store';

export function createStoreListRuntime() {
  const storeInstance = createStoreListStore();
  const actions = createStoreListActions(storeInstance);
  const commands = createStoreListCommands(actions);

  return { storeInstance, actions, commands };
}

export type StoreListRuntime = ReturnType<typeof createStoreListRuntime>;
export type StoreListActions = ReturnType<typeof createStoreListActions>;
