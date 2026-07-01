import { activeStoreCommands } from '@/app/global/activeStore/activeStore.commands';
import { createStoreDetailCommands } from '@/features/merchant/store/detail/commands';
import type { StoreDetailActions } from '@/features/merchant/store/detail/actions';
import {
  createStoreMutationCommands,
  type UpdateStoreResult,
  type UploadStoreImageResult,
} from '@/features/merchant/store/mutations/commands';
import type { StoreImageKind } from '@/models/asset';
import type { UpdateStoreRequest } from '@/models/store';

export type StoreSettingsPageCommands = {
  loadStore(storeId: string): Promise<void>;
  updateStore(
    storeId: string,
    input: UpdateStoreRequest,
  ): Promise<UpdateStoreResult>;
  // Upload-only: returns the hosted image, persisting is left to updateStore so
  // the page can save branding and form fields in a single patch.
  uploadStoreImage(
    storeId: string,
    kind: StoreImageKind,
    file: File,
  ): Promise<UploadStoreImageResult>;
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
    uploadStoreImage: mutationCommands.uploadStoreImage,
  };
}
