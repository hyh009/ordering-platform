import { activeStoreCommands } from '@/app/global/activeStore/activeStore.commands';
import { createStoreListRuntime } from '@/features/store/storeList/runtime';

export function createStoreSelectPageCommands(
  storeListRuntime: ReturnType<typeof createStoreListRuntime>,
) {
  return {
    loadStores: storeListRuntime.commands.loadStores,

    selectStore(storeId: string, organizationId: string) {
      activeStoreCommands.setStore(storeId, organizationId);
    },
  };
}
