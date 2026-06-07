import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from 'zustand';
import { activeOrgStore } from '@/app/global/activeOrg/activeOrg.store';
import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { PATHS } from '@/app/routing/paths';
import { createStoreListRuntime } from '@/features/merchant/store/list/runtime';
import { createStoreSelectPageCommands } from './storeSelectPage.commands';

export function useStoreSelectPageVM() {
  const runtime = useMemo(() => createStoreListRuntime(), []);
  const commands = useMemo(
    () => createStoreSelectPageCommands(runtime.actions),
    [runtime],
  );

  const organizationId = useStore(activeOrgStore, (s) => s.organizationId);
  const organizationName = useStore(activeOrgStore, (s) => s.organizationName);
  const activeStoreId = useStore(activeStoreStore, (s) => s.storeId);
  const stores = useStore(runtime.storeInstance, (s) => s.stores);
  const isLoading = useStore(runtime.storeInstance, (s) => s.isLoading);
  const error = useStore(runtime.storeInstance, (s) => s.error);

  const navigate = useNavigate();

  useEffect(() => {
    if (!organizationId) {
      void navigate(PATHS.MERCHANT.SELECT_ORG, { replace: true });
      return;
    }

    void commands.loadStores(organizationId);
  }, [organizationId, commands, navigate]);

  const selectStore = useCallback(
    (storeId: string) => {
      if (!organizationId) return;

      commands.selectStore(storeId, organizationId);
      void navigate(PATHS.MERCHANT.MENU);
    },
    [organizationId, commands, navigate],
  );

  return {
    organizationName,
    stores,
    isLoading,
    error,
    activeStoreId,
    selectStore,
  };
}
