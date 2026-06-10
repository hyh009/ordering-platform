import type { ProductListActions } from '@/features/merchant/menu/products/list/actions';
import {
  createProductListCommands,
  type LoadProductsResult,
} from '@/features/merchant/menu/products/list/commands';
import {
  createProductMutationCommands,
  type ToggleProductSoldOutResult,
} from '@/features/merchant/menu/products/mutations/commands';
import type { ProductActiveFilter } from '@/models/product';

export type ProductListPageCommands = {
  loadProducts(
    storeId: string,
    isActive: ProductActiveFilter,
  ): Promise<LoadProductsResult>;
  toggleSoldOut(
    storeId: string,
    productId: string,
    isSoldOut: boolean,
  ): Promise<ToggleProductSoldOutResult>;
};

export function createProductListPageCommands(
  actions: ProductListActions,
): ProductListPageCommands {
  const listCommands = createProductListCommands(actions);
  const mutationCommands = createProductMutationCommands();

  return {
    loadProducts: listCommands.loadProducts,

    async toggleSoldOut(storeId, productId, isSoldOut) {
      const result = await mutationCommands.toggleSoldOut(storeId, productId, {
        isSoldOut,
      });

      if (result.status === 'saved') {
        actions.productSaved(result.product);
      }

      return result;
    },
  };
}
