import type { ProductActiveFilter } from '@/models/product';
import { productService } from '@/services/product.service';
import {
  mapMerchantApiError,
  type MerchantCommandFailure,
} from '@/services/utils/merchantApiError';
import type { ProductListActions } from './actions';

export type LoadProductsResult = { status: 'loaded' } | MerchantCommandFailure;

export type ProductListCommands = {
  loadProducts(
    storeId: string,
    isActive: ProductActiveFilter,
    categoryId?: string,
  ): Promise<LoadProductsResult>;
};

export function createProductListCommands(
  actions: ProductListActions,
): ProductListCommands {
  return {
    async loadProducts(storeId, isActive, categoryId) {
      actions.loadStarted();

      try {
        const products = await productService.listProducts(
          storeId,
          isActive,
          categoryId,
        );

        actions.loadSucceeded(products);
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapMerchantApiError(error);

        actions.loadFailed(failure.message);
        return failure;
      }
    },
  };
}
