import { createOrganizationMembershipListActions } from './actions';
import { createOrganizationMembershipListStore } from './store';

export function createOrganizationMembershipListRuntime() {
  const store = createOrganizationMembershipListStore();
  const actions = createOrganizationMembershipListActions(store);

  return { actions, store };
}
