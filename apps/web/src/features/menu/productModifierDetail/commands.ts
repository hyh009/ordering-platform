import { tDefault } from '@/app/i18n';
import { updateProductModifierSchema } from '@/models/productModifier';
import type {
  ProductModifier,
  UpdateProductModifierRequest,
} from '@/models/productModifier';
import { productModifierService } from '@/services/productModifier.service';
import {
  mapMerchantApiError,
  type MerchantCommandFailure,
} from '@/services/utils/merchantApiError';
import {
  mapProductModifierFieldErrors,
  type ProductModifierCommandFieldErrors,
} from '../components/productModifierForm/productModifierFormErrors';
import type { ProductModifierDetailActions } from './actions';

export type { ProductModifierCommandFieldErrors };

export type LoadModifierResult = { status: 'loaded' } | MerchantCommandFailure;

export type SaveModifierResult =
  | { modifier: ProductModifier; status: 'saved' }
  | (MerchantCommandFailure & { fieldErrors?: ProductModifierCommandFieldErrors });

export type ProductModifierDetailCommands = {
  loadModifier(
    storeId: string,
    productModifierId: string,
  ): Promise<LoadModifierResult>;
  updateModifier(
    storeId: string,
    productModifierId: string,
    input: UpdateProductModifierRequest,
  ): Promise<SaveModifierResult>;
};

export function createProductModifierDetailCommands(
  actions: ProductModifierDetailActions,
): ProductModifierDetailCommands {
  return {
    async loadModifier(storeId, productModifierId) {
      actions.loadStarted();

      try {
        const modifier = await productModifierService.getProductModifier(
          storeId,
          productModifierId,
        );

        actions.loadSucceeded(modifier);
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapMerchantApiError(error);

        actions.loadFailed(failure.message);
        return failure;
      }
    },

    async updateModifier(storeId, productModifierId, input) {
      const validation = updateProductModifierSchema.safeParse(input);

      if (!validation.success) {
        return {
          fieldErrors: mapProductModifierFieldErrors(validation.error.issues),
          message: tDefault(
            'merchant.errors.validation',
            'Check the highlighted fields and try again.',
          ),
          reason: 'invalid',
          status: 'failed',
        };
      }

      try {
        const modifier = await productModifierService.updateProductModifier(
          storeId,
          productModifierId,
          input,
        );

        actions.modifierUpdated(modifier);
        return { modifier, status: 'saved' };
      } catch (error) {
        return mapMerchantApiError(error);
      }
    },
  };
}
