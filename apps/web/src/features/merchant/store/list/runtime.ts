import { createStoreListActions } from './actions';
import { createStoreListStore } from './store';

export function createStoreListRuntime() {
  const store = createStoreListStore();
  const actions = createStoreListActions(store);

  return { actions, store };
}
