import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from 'zustand';
import { authStore } from '@/app/global/auth/auth.store';
import { activeOrgStore } from '@/app/global/activeOrg/activeOrg.store';
import { PATHS } from '@/app/routing/paths';
import { orgSelectPageCommands } from './orgSelectPage.commands';

export function useOrgSelectPageVM() {
  const memberships = useStore(authStore, (s) => s.user?.memberships) ?? [];
  const activeOrgId = useStore(activeOrgStore, (s) => s.organizationId);
  const navigate = useNavigate();

  const selectOrg = useCallback(
    (organizationId: string, organizationName: string) => {
      orgSelectPageCommands.selectOrg(organizationId, organizationName);
      void navigate(PATHS.MERCHANT.SELECT_STORE);
    },
    [navigate],
  );

  return {
    memberships,
    activeOrgId,
    selectOrg,
  };
}
