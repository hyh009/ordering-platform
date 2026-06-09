import { createStoreDetailActions } from './actions';
import { createStoreDetailStore } from './store';

export function createStoreDetailRuntime() {
  const store = createStoreDetailStore();
  const actions = createStoreDetailActions(store);

  return { actions, store };
}
