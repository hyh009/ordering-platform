import { storeService } from '@/services/store.service';
import type { StoreListActions } from './runtime';

export function createStoreListCommands(actions: StoreListActions) {
  return {
    async loadStores(organizationId: string) {
      actions.setLoading();

      try {
        const result = await storeService.listStores(organizationId);

        actions.setStores(result.stores);
      } catch {
        actions.setError('Failed to load stores.');
      }
    },
  };
}
