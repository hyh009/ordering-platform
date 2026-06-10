import { productService } from '@/services/product.service';
import {
  mapMerchantApiError,
  type MerchantCommandFailure,
} from '@/services/utils/merchantApiError';
import type { ProductDetailActions } from './actions';

export type LoadProductResult = { status: 'loaded' } | MerchantCommandFailure;

export type ProductDetailCommands = {
  loadProduct(storeId: string, productId: string): Promise<LoadProductResult>;
};

export function createProductDetailCommands(
  actions: ProductDetailActions,
): ProductDetailCommands {
  return {
    async loadProduct(storeId, productId) {
      actions.loadStarted();

      try {
        const product = await productService.getProduct(storeId, productId);

        actions.loadSucceeded(product);
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapMerchantApiError(error);

        actions.loadFailed(failure.message);
        return failure;
      }
    },
  };
}
