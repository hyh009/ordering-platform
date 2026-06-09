import { storeService } from '@/services/store.service';
import { mapMerchantApiError } from '@/services/utils/merchantApiError';
import type { StoreListActions } from './actions';

export function createStoreListCommands(actions: StoreListActions) {
  return {
    async loadStores(organizationId: string) {
      actions.setLoading();

      try {
        const result = await storeService.listStores(organizationId);

        actions.setStores(result.stores);
      } catch (error) {
        actions.setError(mapMerchantApiError(error).message);
      }
    },
  };
}
