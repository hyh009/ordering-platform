import { createOrderDetailActions } from './actions';
import { createOrderDetailStore } from './store';

export function createOrderDetailRuntime() {
  const store = createOrderDetailStore();
  const actions = createOrderDetailActions(store);

  return { actions, store };
}
