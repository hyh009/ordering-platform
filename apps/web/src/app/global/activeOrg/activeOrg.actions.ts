import { activeOrgStore } from './activeOrg.store';

export const activeOrgActions = {
  setOrg(organizationId: string, organizationName: string) {
    activeOrgStore.setState({ organizationId, organizationName });
  },

  clearOrg() {
    activeOrgStore.setState({ organizationId: null, organizationName: null });
  },
};
