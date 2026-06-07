import { createOrganizationDetailActions } from './actions';
import { createOrganizationDetailStore } from './store';

export function createOrganizationDetailRuntime() {
  const store = createOrganizationDetailStore();
  const actions = createOrganizationDetailActions(store);

  return {
    actions,
    store,
  };
}
