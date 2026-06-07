import { createAllergenListActions } from './actions';
import { createAllergenListStore } from './store';

export function createAllergenListRuntime() {
  const store = createAllergenListStore();
  const actions = createAllergenListActions(store);

  return {
    actions,
    store,
  };
}
