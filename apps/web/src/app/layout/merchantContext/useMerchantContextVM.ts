import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from 'zustand';
import { activeOrgStore } from '@/app/global/activeOrg/activeOrg.store';
import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { authStore } from '@/app/global/auth/auth.store';
import { useAppTranslation } from '@/app/i18n';
import { PATHS } from '@/app/routing/paths';
import { createStoreDetailRuntime } from '@/features/merchant/store/detail/runtime';
import { createStoreListRuntime } from '@/features/merchant/store/list/runtime';
import { getLocalizedText, languageToLocale } from '@/models/metadata';
import { isStoreOpenNow } from '@/models/store';
import { createMerchantContextCommands } from './commands';

export type MerchantOrgOption = {
  id: string;
  name: string;
  isActive: boolean;
};

export type MerchantStoreOption = {
  id: string;
  name: string;
  isActive: boolean;
};

/**
 * Drives the merchant header org/store switcher. Owns the store-list runtime
 * (switcher options, loaded lazily when the store menu opens) and the
 * store-detail runtime (active store business hours, for the open/closed
 * badge). The layout stays mounted across merchant routes, so these reads are
 * not refetched on navigation.
 */
export function useMerchantContextVM() {
  const listRuntime = useMemo(() => createStoreListRuntime(), []);
  const detailRuntime = useMemo(() => createStoreDetailRuntime(), []);
  const commands = useMemo(
    () =>
      createMerchantContextCommands(listRuntime.actions, detailRuntime.actions),
    [listRuntime, detailRuntime],
  );
  const navigate = useNavigate();
  const { language } = useAppTranslation();
  const locale = languageToLocale(language);

  const memberships = useStore(authStore, (s) => s.user?.memberships);
  const organizationId = useStore(activeOrgStore, (s) => s.organizationId);
  const organizationName = useStore(activeOrgStore, (s) => s.organizationName);
  const storeId = useStore(activeStoreStore, (s) => s.storeId);
  const storeName = useStore(activeStoreStore, (s) => s.storeName);

  const stores = useStore(listRuntime.store, (s) => s.stores);
  const storesLoading = useStore(listRuntime.store, (s) => s.isLoading);
  const detailStore = useStore(detailRuntime.store, (s) => s.store);

  // Load the active store's detail (business hours) when the selection changes,
  // so the open/closed badge reflects the current store.
  useEffect(() => {
    if (storeId && detailStore?.id !== storeId) {
      void commands.loadStoreDetail(storeId);
    }
  }, [storeId, detailStore?.id, commands]);

  // Lazily load the org's stores the first time the store menu opens, and
  // refresh when the active org changes between opens.
  const loadedOrgIdRef = useRef<string | null>(null);
  const onStoreMenuOpenChange = useCallback(
    (open: boolean) => {
      if (!open || !organizationId) return;
      if (loadedOrgIdRef.current === organizationId) return;

      loadedOrgIdRef.current = organizationId;
      void commands.loadStores(organizationId);
    },
    [organizationId, commands],
  );

  const orgOptions: MerchantOrgOption[] = (memberships ?? []).map((m) => ({
    id: m.organizationId,
    name: m.organizationName,
    isActive: m.organizationId === organizationId,
  }));

  const storeOptions: MerchantStoreOption[] = stores.map((store) => ({
    id: store.id,
    name: getLocalizedText(store.profile.displayName, locale),
    isActive: store.id === storeId,
  }));

  const activeDetail = detailStore?.id === storeId ? detailStore : null;

  // Prefer the eagerly-loaded detail so the name follows the UI language (and
  // resolves selections saved before storeName existed); fall back to the
  // persisted name as an instant placeholder until the detail loads.
  const resolvedStoreName = activeDetail
    ? getLocalizedText(activeDetail.profile.displayName, locale)
    : storeName;

  const isOpen = activeDetail
    ? isStoreOpenNow(activeDetail.operation.businessHours)
    : undefined;

  const switchOrg = useCallback(
    (option: MerchantOrgOption) => {
      if (option.isActive) return;

      commands.switchOrg(option.id, option.name);
      loadedOrgIdRef.current = null;
      void navigate(PATHS.MERCHANT.SELECT_STORE);
    },
    [commands, navigate],
  );

  const switchStore = useCallback(
    (option: MerchantStoreOption) => {
      if (option.isActive || !organizationId) return;

      const selected = stores.find((store) => store.id === option.id);
      if (!selected) return;

      commands.switchStore(
        selected.id,
        getLocalizedText(selected.profile.displayName, locale),
        organizationId,
        selected.locale,
      );
      void navigate(PATHS.MERCHANT.MENU);
    },
    [stores, organizationId, locale, commands, navigate],
  );

  return {
    organizationName,
    storeName: resolvedStoreName,
    isOpen,
    orgOptions,
    storeOptions,
    storesLoading,
    hasMultipleOrgs: orgOptions.length > 1,
    onStoreMenuOpenChange,
    switchOrg,
    switchStore,
  };
}
