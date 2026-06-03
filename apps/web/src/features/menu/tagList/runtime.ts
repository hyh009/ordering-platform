import { createTagListActions } from './actions';
import { createTagListStore } from './store';

export function createTagListRuntime() {
  const store = createTagListStore();
  const actions = createTagListActions(store);

  return {
    actions,
    store,
  };
}
