import { tDefault } from '@/app/i18n';
import {
  createProductModifierSchema,
  updateProductModifierSchema,
} from '@/models/productModifier';
import type {
  CreateProductModifierRequest,
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

export type { ProductModifierCommandFieldErrors };

export type SaveProductModifierResult =
  | { modifier: ProductModifier; status: 'saved' }
  | (MerchantCommandFailure & {
      fieldErrors?: ProductModifierCommandFieldErrors;
    });

export type ProductModifierMutationCommands = {
  createProductModifier(
    storeId: string,
    input: CreateProductModifierRequest,
  ): Promise<SaveProductModifierResult>;
  updateProductModifier(
    storeId: string,
    productModifierId: string,
    input: UpdateProductModifierRequest,
  ): Promise<SaveProductModifierResult>;
};

export function createProductModifierMutationCommands(): ProductModifierMutationCommands {
  return {
    async createProductModifier(storeId, input) {
      const validation = createProductModifierSchema.safeParse(input);

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
        const modifier = await productModifierService.createProductModifier(
          storeId,
          input,
        );

        return { modifier, status: 'saved' };
      } catch (error) {
        return mapMerchantApiError(error);
      }
    },

    async updateProductModifier(storeId, productModifierId, input) {
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

        return { modifier, status: 'saved' };
      } catch (error) {
        return mapMerchantApiError(error);
      }
    },
  };
}
