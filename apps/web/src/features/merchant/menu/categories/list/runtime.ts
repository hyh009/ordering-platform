import { createCategoryListActions } from './actions';
import { createCategoryListStore } from './store';

export function createCategoryListRuntime() {
  const store = createCategoryListStore();
  const actions = createCategoryListActions(store);

  return {
    actions,
    store,
  };
}
