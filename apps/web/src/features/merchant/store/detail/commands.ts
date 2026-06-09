import { storeService } from '@/services/store.service';
import { mapMerchantApiError } from '@/services/utils/merchantApiError';
import type { StoreDetailActions } from './actions';

export function createStoreDetailCommands(actions: StoreDetailActions) {
  return {
    async loadStore(storeId: string): Promise<void> {
      actions.loadStarted();

      try {
        const store = await storeService.getStore(storeId);
        actions.loadSucceeded(store);
      } catch (error) {
        actions.loadFailed(mapMerchantApiError(error).message);
      }
    },
  };
}
