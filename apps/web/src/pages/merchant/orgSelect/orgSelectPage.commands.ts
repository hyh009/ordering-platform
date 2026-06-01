import { activeOrgCommands } from '@/app/global/activeOrg/activeOrg.commands';
import { activeStoreCommands } from '@/app/global/activeStore/activeStore.commands';
import { activeOrgStore } from '@/app/global/activeOrg/activeOrg.store';

export const orgSelectPageCommands = {
  selectOrg(organizationId: string, organizationName: string) {
    activeOrgCommands.setOrg(organizationId, organizationName);
    activeStoreCommands.clearStore();
  },

  getActiveOrgId() {
    return activeOrgStore.getState().organizationId;
  },
};
