import { createProductModifierMutationCommands } from '@/features/menu/productModifiers/mutations/commands';
import type {
  CreateProductModifierRequest,
  ProductModifier,
} from '@/models/productModifier';
import type { MerchantCommandFailure } from '@/services/utils/merchantApiError';
import type { ProductModifierCommandFieldErrors } from '@/features/menu/productModifiers/components/productModifierForm/productModifierFormErrors';

export type CreateModifierResult =
  | { modifier: ProductModifier; status: 'created' }
  | (MerchantCommandFailure & {
      fieldErrors?: ProductModifierCommandFieldErrors;
    });

export type ProductModifierCreatePageCommands = {
  createModifier(
    storeId: string,
    input: CreateProductModifierRequest,
  ): Promise<CreateModifierResult>;
};

export function createProductModifierCreatePageCommands(): ProductModifierCreatePageCommands {
  const mutationCommands = createProductModifierMutationCommands();

  return {
    async createModifier(storeId, input) {
      const result = await mutationCommands.createProductModifier(
        storeId,
        input,
      );

      if (result.status !== 'saved') {
        return result;
      }

      return {
        modifier: result.modifier,
        status: 'created',
      };
    },
  };
}
