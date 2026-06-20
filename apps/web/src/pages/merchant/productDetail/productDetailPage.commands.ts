import type { ProductDetailActions } from '@/features/merchant/menu/products/detail/actions';
import {
  createProductDetailCommands,
  type LoadProductResult,
} from '@/features/merchant/menu/products/detail/commands';
import {
  createProductMutationCommands,
  type UploadProductImageResult,
} from '@/features/merchant/menu/products/mutations/commands';
import type { ProductCommandFieldErrors } from '@/features/merchant/menu/products/components/productForm/productFormErrors';
import type { Product, UpdateProductRequest } from '@/models/product';
import type { MerchantCommandFailure } from '@/services/utils/merchantApiError';

export type { LoadProductResult };

export type SaveProductResult =
  | { product: Product; status: 'saved' }
  | (MerchantCommandFailure & {
      fieldErrors?: ProductCommandFieldErrors;
    });

export type ToggleSoldOutResult =
  | { product: Product; status: 'saved' }
  | MerchantCommandFailure;

export type ProductDetailPageCommands = {
  loadProduct(storeId: string, productId: string): Promise<LoadProductResult>;
  updateProduct(
    storeId: string,
    productId: string,
    input: UpdateProductRequest,
  ): Promise<SaveProductResult>;
  toggleSoldOut(
    storeId: string,
    productId: string,
    isSoldOut: boolean,
  ): Promise<ToggleSoldOutResult>;
  uploadProductImage(
    storeId: string,
    file: File,
  ): Promise<UploadProductImageResult>;
};

export function createProductDetailPageCommands(
  actions: ProductDetailActions,
): ProductDetailPageCommands {
  const detailCommands = createProductDetailCommands(actions);
  const mutationCommands = createProductMutationCommands();

  return {
    loadProduct: detailCommands.loadProduct,

    async updateProduct(storeId, productId, input) {
      const result = await mutationCommands.updateProduct(
        storeId,
        productId,
        input,
      );

      if (result.status === 'saved') {
        actions.productChanged(result.product);
      }

      return result;
    },

    async toggleSoldOut(storeId, productId, isSoldOut) {
      const result = await mutationCommands.toggleSoldOut(storeId, productId, {
        isSoldOut,
      });

      if (result.status === 'saved') {
        actions.productChanged(result.product);
      }

      return result;
    },

    uploadProductImage: mutationCommands.uploadProductImage,
  };
}
