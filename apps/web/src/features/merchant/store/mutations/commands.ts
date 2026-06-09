import { tDefault } from '@/app/i18n';
import { mapStoreValidationIssuesToFieldErrors } from '@/features/components/store/storeForm/storeFormErrors';
import type { StoreFormFieldErrors } from '@/features/components/store/storeForm/useStoreForm';
import {
  updateStoreSchema,
  type Store,
  type UpdateStoreRequest,
} from '@/models/store';
import { storeService } from '@/services/store.service';
import {
  mapMerchantApiError,
  type MerchantCommandFailure,
} from '@/services/utils/merchantApiError';

export type UpdateStoreResult =
  | { status: 'saved'; store: Store }
  | (MerchantCommandFailure & { fieldErrors?: StoreFormFieldErrors });

export function createStoreMutationCommands() {
  return {
    async updateStore(
      storeId: string,
      input: UpdateStoreRequest,
    ): Promise<UpdateStoreResult> {
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

      try {
        const store = await storeService.updateStore(storeId, validation.data);
        return { status: 'saved', store };
      } catch (error) {
        return mapMerchantApiError(error);
      }
    },
  };
}
