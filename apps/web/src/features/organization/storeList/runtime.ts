import { createOrganizationStoreListActions } from './actions';
import { createOrganizationStoreListStore } from './store';

export function createOrganizationStoreListRuntime() {
  const store = createOrganizationStoreListStore();
  const actions = createOrganizationStoreListActions(store);

  return { actions, store };
}
