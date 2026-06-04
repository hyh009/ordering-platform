import { createProductModifierListActions } from './actions';
import { createProductModifierListStore } from './store';

export function createProductModifierListRuntime() {
  const store = createProductModifierListStore();
  const actions = createProductModifierListActions(store);

  return { actions, store };
}
