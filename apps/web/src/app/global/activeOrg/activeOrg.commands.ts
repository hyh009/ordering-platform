import { activeOrgActions } from './activeOrg.actions';

import type { UserOrgMembershipDto } from '@/models/auth';

const STORAGE_KEY = 'activeOrgId';

export const activeOrgCommands = {
  initialize(memberships: UserOrgMembershipDto[]): string | null {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      activeOrgActions.clearOrg();

      if (memberships.length === 1) {
        const m = memberships[0];
        activeOrgCommands.setOrg(m.organizationId, m.organizationName);
        return m.organizationId;
      }

      return null;
    }

    const match = memberships.find((m) => m.organizationId === stored);

    if (match) {
      activeOrgActions.setOrg(match.organizationId, match.organizationName);
      return match.organizationId;
    }

    localStorage.removeItem(STORAGE_KEY);
    activeOrgActions.clearOrg();
    return null;
  },

  setOrg(organizationId: string, organizationName: string) {
    localStorage.setItem(STORAGE_KEY, organizationId);
    activeOrgActions.setOrg(organizationId, organizationName);
  },

  clearOrg() {
    localStorage.removeItem(STORAGE_KEY);
    activeOrgActions.clearOrg();
  },
};
