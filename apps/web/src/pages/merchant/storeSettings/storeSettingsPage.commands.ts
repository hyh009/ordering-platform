import { activeStoreCommands } from '@/app/global/activeStore/activeStore.commands';
import { createStoreDetailCommands } from '@/features/merchant/store/detail/commands';
import type { StoreDetailActions } from '@/features/merchant/store/detail/actions';
import {
  createStoreMutationCommands,
  type UpdateStoreResult,
} from '@/features/merchant/store/mutations/commands';
import type { StoreImageKind } from '@/models/asset';
import type { UpdateStoreRequest } from '@/models/store';

export type StoreSettingsPageCommands = {
  loadStore(storeId: string): Promise<void>;
  updateStore(
    storeId: string,
    input: UpdateStoreRequest,
  ): Promise<UpdateStoreResult>;
  setStoreImage(
    storeId: string,
    kind: StoreImageKind,
    file: File,
  ): Promise<UpdateStoreResult>;
  removeStoreImage(
    storeId: string,
    kind: StoreImageKind,
  ): Promise<UpdateStoreResult>;
};

const imageProfileField: Record<StoreImageKind, 'logoUrl' | 'bannerUrl'> = {
  logo: 'logoUrl',
  banner: 'bannerUrl',
};

export function createStoreSettingsPageCommands(
  actions: StoreDetailActions,
): StoreSettingsPageCommands {
  const detailCommands = createStoreDetailCommands(actions);
  const mutationCommands = createStoreMutationCommands();

  const updateStore = async (
    storeId: string,
    input: UpdateStoreRequest,
  ): Promise<UpdateStoreResult> => {
    const result = await mutationCommands.updateStore(storeId, input);

    if (result.status === 'saved') {
      actions.loadSucceeded(result.store);
      activeStoreCommands.setLocale(storeId, result.store.locale);
    }

    return result;
  };

  return {
    loadStore: detailCommands.loadStore,
    updateStore,

    // Upload the file first, then persist the returned URL onto the store
    // profile so a reload reflects the new branding image.
    async setStoreImage(storeId, kind, file) {
      const uploadResult = await mutationCommands.uploadStoreImage(
        storeId,
        kind,
        file,
      );

      if (uploadResult.status !== 'uploaded') {
        return uploadResult;
      }

      return updateStore(storeId, {
        profile: { [imageProfileField[kind]]: uploadResult.image.url },
      });
    },

    // null clears the stored image on the backend.
    async removeStoreImage(storeId, kind) {
      return updateStore(storeId, {
        profile: { [imageProfileField[kind]]: null },
      });
    },
  };
}
