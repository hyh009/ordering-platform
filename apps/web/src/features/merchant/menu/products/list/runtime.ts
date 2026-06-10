import { createProductListActions } from './actions';
import { createProductListStore } from './store';

export function createProductListRuntime() {
  const store = createProductListStore();
  const actions = createProductListActions(store);

  return { actions, store };
}
