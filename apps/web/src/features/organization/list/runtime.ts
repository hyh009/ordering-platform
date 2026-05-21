import { createOrganizationListActions } from './actions';
import { createOrganizationListStore } from './store';

export function createOrganizationListRuntime() {
  const store = createOrganizationListStore();
  const actions = createOrganizationListActions(store);

  return {
    actions,
    store,
  };
}
