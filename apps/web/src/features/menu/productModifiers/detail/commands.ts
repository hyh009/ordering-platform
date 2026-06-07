import { productModifierService } from '@/services/productModifier.service';
import {
  mapMerchantApiError,
  type MerchantCommandFailure,
} from '@/services/utils/merchantApiError';
import type { ProductModifierDetailActions } from './actions';

export type LoadModifierResult = { status: 'loaded' } | MerchantCommandFailure;

export type ProductModifierDetailCommands = {
  loadModifier(
    storeId: string,
    productModifierId: string,
  ): Promise<LoadModifierResult>;
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
  };
}
