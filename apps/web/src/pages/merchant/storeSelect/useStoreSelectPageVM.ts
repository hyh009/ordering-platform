import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from 'zustand';
import { activeOrgStore } from '@/app/global/activeOrg/activeOrg.store';
import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { PATHS } from '@/app/routing/paths';
import { useAppTranslation } from '@/app/i18n';
import { createStoreListRuntime } from '@/features/merchant/store/list/runtime';
import { getLocalizedText, languageToLocale } from '@/models/metadata';
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
  const stores = useStore(runtime.store, (s) => s.stores);
  const isLoading = useStore(runtime.store, (s) => s.isLoading);
  const error = useStore(runtime.store, (s) => s.error);

  const navigate = useNavigate();
  const { language } = useAppTranslation();
  const locale = languageToLocale(language);

  useEffect(() => {
    if (!organizationId) {
      void navigate(PATHS.MERCHANT.SELECT_ORG, { replace: true });
      return;
    }

    void commands.loadStores(organizationId);
  }, [organizationId, commands, navigate]);

  const retry = useCallback(() => {
    if (organizationId) void commands.loadStores(organizationId);
  }, [organizationId, commands]);

  const selectStore = useCallback(
    (storeId: string) => {
      if (!organizationId) return;

      const selected = stores.find((store) => store.id === storeId);
      if (!selected) return;

      commands.selectStore(
        storeId,
        getLocalizedText(selected.profile.displayName, locale),
        organizationId,
        selected.locale,
      );
      void navigate(PATHS.MERCHANT.MENU);
    },
    [organizationId, stores, locale, commands, navigate],
  );

  return {
    organizationName,
    stores,
    isLoading,
    error,
    activeStoreId,
    retry,
    selectStore,
  };
}
