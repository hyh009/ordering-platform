import { createProductFormOptionsActions } from './actions';
import { createProductFormOptionsStore } from './store';

export function createProductFormOptionsRuntime() {
  const store = createProductFormOptionsStore();
  const actions = createProductFormOptionsActions(store);

  return { actions, store };
}
