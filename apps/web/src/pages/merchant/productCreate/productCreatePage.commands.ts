import { createProductMutationCommands } from '@/features/merchant/menu/products/mutations/commands';
import type { ProductCommandFieldErrors } from '@/features/merchant/menu/products/components/productForm/productFormErrors';
import type { CreateProductRequest, Product } from '@/models/product';
import type { MerchantCommandFailure } from '@/services/utils/merchantApiError';

export type CreateProductResult =
  | { product: Product; status: 'created' }
  | (MerchantCommandFailure & {
      fieldErrors?: ProductCommandFieldErrors;
    });

export type ProductCreatePageCommands = {
  createProduct(
    storeId: string,
    input: CreateProductRequest,
  ): Promise<CreateProductResult>;
};

export function createProductCreatePageCommands(): ProductCreatePageCommands {
  const mutationCommands = createProductMutationCommands();

  return {
    async createProduct(storeId, input) {
      const result = await mutationCommands.createProduct(storeId, input);

      if (result.status !== 'saved') {
        return result;
      }

      return { product: result.product, status: 'created' };
    },
  };
}
