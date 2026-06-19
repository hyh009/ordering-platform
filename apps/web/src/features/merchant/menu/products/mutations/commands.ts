import { tDefault } from '@/app/i18n';
import { createProductSchema, updateProductSchema } from '@/models/product';
import type {
  CreateProductRequest,
  Product,
  ToggleProductSoldOutRequest,
  UpdateProductRequest,
} from '@/models/product';
import { productService } from '@/services/product.service';
import {
  mapMerchantApiError,
  type MerchantCommandFailure,
} from '@/services/utils/merchantApiError';
import {
  mapProductFieldErrors,
  type ProductCommandFieldErrors,
} from '../components/productForm/productFormErrors';

export type { ProductCommandFieldErrors };

export type SaveProductResult =
  | { product: Product; status: 'saved' }
  | (MerchantCommandFailure & {
      fieldErrors?: ProductCommandFieldErrors;
    });

export type ToggleProductSoldOutResult =
  | { product: Product; status: 'saved' }
  | MerchantCommandFailure;

export type ProductMutationCommands = {
  createProduct(
    storeId: string,
    input: CreateProductRequest,
  ): Promise<SaveProductResult>;
  updateProduct(
    storeId: string,
    productId: string,
    input: UpdateProductRequest,
  ): Promise<SaveProductResult>;
  toggleSoldOut(
    storeId: string,
    productId: string,
    input: ToggleProductSoldOutRequest,
  ): Promise<ToggleProductSoldOutResult>;
};

export function createProductMutationCommands(): ProductMutationCommands {
  return {
    async createProduct(storeId, input) {
      const validation = createProductSchema.safeParse(input);

      if (!validation.success) {
        return {
          fieldErrors: mapProductFieldErrors(validation.error.issues),
          message: tDefault(
            'merchant.errors.validation',
            'Invalid input. Check your details and try again.',
          ),
          reason: 'invalid',
          status: 'failed',
        };
      }

      try {
        const product = await productService.createProduct(storeId, input);

        return { product, status: 'saved' };
      } catch (error) {
        return mapMerchantApiError(error);
      }
    },

    async updateProduct(storeId, productId, input) {
      const validation = updateProductSchema.safeParse(input);

      if (!validation.success) {
        return {
          fieldErrors: mapProductFieldErrors(validation.error.issues),
          message: tDefault(
            'merchant.errors.validation',
            'Invalid input. Check your details and try again.',
          ),
          reason: 'invalid',
          status: 'failed',
        };
      }

      try {
        const product = await productService.updateProduct(
          storeId,
          productId,
          input,
        );

        return { product, status: 'saved' };
      } catch (error) {
        return mapMerchantApiError(error);
      }
    },

    async toggleSoldOut(storeId, productId, input) {
      try {
        const product = await productService.toggleSoldOut(
          storeId,
          productId,
          input,
        );

        return { product, status: 'saved' };
      } catch (error) {
        return mapMerchantApiError(error);
      }
    },
  };
}
