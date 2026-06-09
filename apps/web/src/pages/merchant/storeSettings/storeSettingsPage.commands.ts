import { createStoreDetailCommands } from '@/features/merchant/store/detail/commands';
import type { StoreDetailActions } from '@/features/merchant/store/detail/actions';
import {
  createStoreMutationCommands,
  type UpdateStoreResult,
} from '@/features/merchant/store/mutations/commands';
import type { UpdateStoreRequest } from '@/models/store';

export type StoreSettingsPageCommands = {
  loadStore(storeId: string): Promise<void>;
  updateStore(
    storeId: string,
    input: UpdateStoreRequest,
  ): Promise<UpdateStoreResult>;
};

export function createStoreSettingsPageCommands(
  actions: StoreDetailActions,
): StoreSettingsPageCommands {
  const detailCommands = createStoreDetailCommands(actions);
  const mutationCommands = createStoreMutationCommands();

  return {
    loadStore: detailCommands.loadStore,

    async updateStore(storeId, input) {
      const result = await mutationCommands.updateStore(storeId, input);

      if (result.status === 'saved') {
        actions.loadSucceeded(result.store);
      }

      return result;
    },
  };
}
