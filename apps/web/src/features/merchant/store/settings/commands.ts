import { tDefault } from '@/app/i18n';
import { mapStoreValidationIssuesToFieldErrors } from '@/features/components/store/storeForm/storeFormErrors';
import type { StoreFormFieldErrors } from '@/features/components/store/storeForm/useStoreForm';
import { updateStoreSchema } from '@/models/store';
import { storeService } from '@/services/store.service';
import {
  mapMerchantApiError,
  type MerchantCommandFailure,
} from '@/services/utils/merchantApiError';
import type { Store, UpdateStoreRequest } from '@/models/store';
import type { StoreSettingsActions } from './runtime';

export type SaveStoreSettingsResult =
  | { status: 'saved'; store: Store }
  | (MerchantCommandFailure & { fieldErrors?: StoreFormFieldErrors });

export function createStoreSettingsCommands(actions: StoreSettingsActions) {
  return {
    async loadStore(storeId: string): Promise<void> {
      actions.setLoading();

      try {
        const store = await storeService.getStore(storeId);
        actions.setStore(store);
      } catch (error) {
        actions.setError(mapMerchantApiError(error).message);
      }
    },

    async updateStore(
      storeId: string,
      input: UpdateStoreRequest,
    ): Promise<SaveStoreSettingsResult> {
      const validation = updateStoreSchema.safeParse(input);

      if (!validation.success) {
        const defaultLocale = input.locale?.defaultLocale ?? 'zh-TW';
        return {
          fieldErrors: mapStoreValidationIssuesToFieldErrors(
            validation.error.issues,
            defaultLocale,
          ),
          message: tDefault(
            'merchant.errors.validation',
            'Check the highlighted fields and try again.',
          ),
          reason: 'invalid',
          status: 'failed',
        };
      }

      actions.setSaving();

      try {
        const store = await storeService.updateStore(storeId, validation.data);
        actions.setSaved(store);
        return { status: 'saved', store };
      } catch (error) {
        const failure = mapMerchantApiError(error);
        actions.setError(failure.message);
        return failure;
      }
    },
  };
}
