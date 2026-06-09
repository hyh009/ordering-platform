import {
  createStoreSettingsCommands,
  type SaveStoreSettingsResult,
} from '@/features/merchant/store/settings/commands';
import type { StoreSettingsActions } from '@/features/merchant/store/settings/runtime';
import type { UpdateStoreRequest } from '@/models/store';

export type StoreSettingsPageCommands = {
  loadStore(storeId: string): Promise<void>;
  updateStore(
    storeId: string,
    input: UpdateStoreRequest,
  ): Promise<SaveStoreSettingsResult>;
};

export function createStoreSettingsPageCommands(
  actions: StoreSettingsActions,
): StoreSettingsPageCommands {
  const featureCommands = createStoreSettingsCommands(actions);

  return {
    loadStore: featureCommands.loadStore,
    updateStore: featureCommands.updateStore,
  };
}
