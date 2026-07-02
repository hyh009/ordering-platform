import { apiJson } from '@/api';
import { menuPaths } from '@/api/paths/menu.paths';
import { assetModel } from '@/models/asset';
import { productModel } from '@/models/product';
import type {
  CreateProductRequest,
  CreateProductSuccessResponse,
  GetProductSuccessResponse,
  ListProductsSuccessResponse,
  ProductActiveFilter,
  ToggleProductSoldOutRequest,
  ToggleProductSoldOutSuccessResponse,
  UpdateProductRequest,
  UpdateProductSuccessResponse,
} from '@/models/product';
import type { UploadedImage } from '@/models/asset';
import type { UploadImageSuccessResponse } from '@repo/shared';
import { withActiveFilter } from './utils/activeFilter';

export const productService = {
  async listProducts(
    storeId: string,
    isActive: ProductActiveFilter,
    categoryId?: string,
  ) {
    let path = withActiveFilter(menuPaths.products(storeId), isActive);
    if (categoryId !== undefined) {
      path += `&categoryId=${encodeURIComponent(categoryId)}`;
    }

    const response = await apiJson<ListProductsSuccessResponse>(path);

    return response.data.products.map(productModel.deserialize);
  },

  async getProduct(storeId: string, productId: string) {
    const response = await apiJson<GetProductSuccessResponse>(
      menuPaths.productDetail(storeId, productId),
    );

    return productModel.deserialize(response.data.product);
  },

  async createProduct(storeId: string, input: CreateProductRequest) {
    const response = await apiJson<CreateProductSuccessResponse>(
      menuPaths.products(storeId),
      {
        body: JSON.stringify(input),
        method: 'POST',
      },
    );

    return productModel.deserialize(response.data.product);
  },

  async updateProduct(
    storeId: string,
    productId: string,
    input: UpdateProductRequest,
  ) {
    const response = await apiJson<UpdateProductSuccessResponse>(
      menuPaths.productDetail(storeId, productId),
      {
        body: JSON.stringify(input),
        method: 'PATCH',
      },
    );

    return productModel.deserialize(response.data.product);
  },

  async toggleSoldOut(
    storeId: string,
    productId: string,
    input: ToggleProductSoldOutRequest,
  ) {
    const response = await apiJson<ToggleProductSoldOutSuccessResponse>(
      menuPaths.productSoldOut(storeId, productId),
      {
        body: JSON.stringify(input),
        method: 'PATCH',
      },
    );

    return productModel.deserialize(response.data.product);
  },

  async uploadProductImage(
    storeId: string,
    file: File,
  ): Promise<UploadedImage> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiJson<UploadImageSuccessResponse>(
      menuPaths.productImages(storeId),
      {
        body: formData,
        method: 'POST',
      },
    );

    return assetModel.deserialize(response.data.image);
  },
};
