import { activeStoreCommands } from '@/app/global/activeStore/activeStore.commands';
import type { StoreListActions } from '@/features/merchant/store/list/actions';
import { createStoreListCommands } from '@/features/merchant/store/list/commands';
import type { StoreLocaleDto } from '@/models/store';

export function createStoreSelectPageCommands(
  storeListActions: StoreListActions,
) {
  const storeListCommands = createStoreListCommands(storeListActions);

  return {
    loadStores: storeListCommands.loadStores,

    selectStore(
      storeId: string,
      storeName: string,
      organizationId: string,
      locale: StoreLocaleDto,
    ) {
      activeStoreCommands.setStore(storeId, storeName, organizationId, locale);
    },
  };
}
