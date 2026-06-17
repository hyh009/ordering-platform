import { activeOrgCommands } from '@/app/global/activeOrg/activeOrg.commands';
import { activeStoreCommands } from '@/app/global/activeStore/activeStore.commands';
import type { StoreDetailActions } from '@/features/merchant/store/detail/actions';
import { createStoreDetailCommands } from '@/features/merchant/store/detail/commands';
import type { StoreListActions } from '@/features/merchant/store/list/actions';
import { createStoreListCommands } from '@/features/merchant/store/list/commands';
import type { StoreLocaleDto } from '@/models/store';

/**
 * Async flows for the merchant header org/store switcher. Composes the store
 * list (switcher options) and store detail (active store business hours, for
 * the open/closed badge) reads with the active-org/active-store selection
 * commands. Navigation reactions stay in the page VM.
 */
export function createMerchantContextCommands(
  storeListActions: StoreListActions,
  storeDetailActions: StoreDetailActions,
) {
  const storeListCommands = createStoreListCommands(storeListActions);
  const storeDetailCommands = createStoreDetailCommands(storeDetailActions);

  return {
    loadStores: storeListCommands.loadStores,
    loadStoreDetail: storeDetailCommands.loadStore,

    // Switch the active organization. Stores are scoped per organization, so the
    // previous store selection is cleared; the VM then routes to store select.
    switchOrg(organizationId: string, organizationName: string) {
      activeOrgCommands.setOrg(organizationId, organizationName);
      activeStoreCommands.clearStore();
    },

    switchStore(
      storeId: string,
      storeName: string,
      organizationId: string,
      locale: StoreLocaleDto | null,
    ) {
      activeStoreCommands.setStore(storeId, storeName, organizationId, locale);
    },
  };
}
