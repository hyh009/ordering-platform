import { activeStoreCommands } from '@/app/global/activeStore/activeStore.commands';
import type { StoreListActions } from '@/features/merchant/store/list/runtime';
import { createStoreListCommands } from '@/features/merchant/store/list/commands';

export function createStoreSelectPageCommands(
  storeListActions: StoreListActions,
) {
  const storeListCommands = createStoreListCommands(storeListActions);

  return {
    loadStores: storeListCommands.loadStores,

    selectStore(storeId: string, organizationId: string) {
      activeStoreCommands.setStore(storeId, organizationId);
    },
  };
}
