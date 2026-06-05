import { tDefault } from '@/app/i18n';
import { createProductModifierSchema } from '@/models/productModifier';
import type { CreateProductModifierRequest, ProductModifier } from '@/models/productModifier';
import { productModifierService } from '@/services/productModifier.service';
import {
  mapMerchantApiError,
  type MerchantCommandFailure,
} from '@/services/utils/merchantApiError';
import {
  mapProductModifierFieldErrors,
  type ProductModifierCommandFieldErrors,
} from '@/features/menu/components/productModifierForm/productModifierFormErrors';

export type CreateModifierResult =
  | { modifier: ProductModifier; status: 'created' }
  | (MerchantCommandFailure & { fieldErrors?: ProductModifierCommandFieldErrors });

export const productModifierCreatePageCommands = {
  async createModifier(
    storeId: string,
    input: CreateProductModifierRequest,
  ): Promise<CreateModifierResult> {
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

      return { modifier, status: 'created' };
    } catch (error) {
      return mapMerchantApiError(error);
    }
  },
};
