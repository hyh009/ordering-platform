import type { ProductModifierActiveFilter } from '@/models/productModifier';
import { productModifierService } from '@/services/productModifier.service';
import {
  mapMerchantApiError,
  type MerchantCommandFailure,
} from '@/services/utils/merchantApiError';
import type { ProductModifierListActions } from './actions';

export type LoadProductModifiersResult =
  | { status: 'loaded' }
  | MerchantCommandFailure;

export type ProductModifierListCommands = {
  loadProductModifiers(
    storeId: string,
    isActive: ProductModifierActiveFilter,
  ): Promise<LoadProductModifiersResult>;
};

export function createProductModifierListCommands(
  actions: ProductModifierListActions,
): ProductModifierListCommands {
  return {
    async loadProductModifiers(storeId, isActive) {
      actions.loadStarted();

      try {
        const productModifiers =
          await productModifierService.listProductModifiers(storeId, isActive);

        actions.loadSucceeded(productModifiers);
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapMerchantApiError(error);

        actions.loadFailed(failure.message);
        return failure;
      }
    },
  };
}
