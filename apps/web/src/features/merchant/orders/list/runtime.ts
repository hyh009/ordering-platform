import { createOrderListActions } from './actions';
import { createOrderListStore } from './store';

export function createOrderListRuntime() {
  const store = createOrderListStore();
  const actions = createOrderListActions(store);

  return { actions, store };
}
