import { createProductDetailActions } from './actions';
import { createProductDetailStore } from './store';

export function createProductDetailRuntime() {
  const store = createProductDetailStore();
  const actions = createProductDetailActions(store);

  return { actions, store };
}
