import { createProductModifierDetailActions } from './actions';
import { createProductModifierDetailStore } from './store';

export function createProductModifierDetailRuntime() {
  const store = createProductModifierDetailStore();
  const actions = createProductModifierDetailActions(store);

  return { actions, store };
}
