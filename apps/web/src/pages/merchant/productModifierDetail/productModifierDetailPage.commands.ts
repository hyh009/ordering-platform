import type { ProductModifierDetailActions } from '@/features/merchant/menu/productModifiers/detail/actions';
import {
  createProductModifierDetailCommands,
  type LoadModifierResult,
} from '@/features/merchant/menu/productModifiers/detail/commands';
import { createProductModifierMutationCommands } from '@/features/merchant/menu/productModifiers/mutations/commands';
import type {
  ProductModifier,
  UpdateProductModifierRequest,
} from '@/models/productModifier';
import type { MerchantCommandFailure } from '@/services/utils/merchantApiError';
import type { ProductModifierCommandFieldErrors } from '@/features/merchant/menu/productModifiers/components/productModifierForm/productModifierFormErrors';

export type { LoadModifierResult };

export type SaveModifierResult =
  | { modifier: ProductModifier; status: 'saved' }
  | (MerchantCommandFailure & {
      fieldErrors?: ProductModifierCommandFieldErrors;
    });

export type ProductModifierDetailPageCommands = {
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

export function createProductModifierDetailPageCommands(
  actions: ProductModifierDetailActions,
): ProductModifierDetailPageCommands {
  const detailCommands = createProductModifierDetailCommands(actions);
  const mutationCommands = createProductModifierMutationCommands();

  return {
    loadModifier: detailCommands.loadModifier,

    async updateModifier(storeId, productModifierId, input) {
      const result = await mutationCommands.updateProductModifier(
        storeId,
        productModifierId,
        input,
      );

      if (result.status === 'saved') {
        await detailCommands.loadModifier(storeId, productModifierId);
      }

      return result;
    },
  };
}
