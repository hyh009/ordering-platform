import { apiJson } from '@/api';
import { menuPaths } from '@/api/paths/menu.paths';
import { productModifierModel } from '@/models/productModifier';
import type {
  CreateProductModifierSuccessResponse,
  GetProductModifierSuccessResponse,
  ListProductModifiersSuccessResponse,
  UpdateProductModifierSuccessResponse,
} from '@repo/shared';
import type {
  CreateProductModifierRequest,
  ProductModifierActiveFilter,
  UpdateProductModifierRequest,
} from '@/models/productModifier';
import { withActiveFilter } from './utils/activeFilter';

export const productModifierService = {
  async listProductModifiers(storeId: string, isActive: ProductModifierActiveFilter) {
    const response = await apiJson<ListProductModifiersSuccessResponse>(
      withActiveFilter(menuPaths.productModifiers(storeId), isActive),
    );

    return response.data.productModifiers.map(productModifierModel.deserialize);
  },

  async getProductModifier(storeId: string, productModifierId: string) {
    const response = await apiJson<GetProductModifierSuccessResponse>(
      menuPaths.productModifierDetail(storeId, productModifierId),
    );

    return productModifierModel.deserialize(response.data.productModifier);
  },

  async createProductModifier(storeId: string, input: CreateProductModifierRequest) {
    const response = await apiJson<CreateProductModifierSuccessResponse>(
      menuPaths.productModifiers(storeId),
      {
        body: JSON.stringify(input),
        method: 'POST',
      },
    );

    return productModifierModel.deserialize(response.data.productModifier);
  },

  async updateProductModifier(
    storeId: string,
    productModifierId: string,
    input: UpdateProductModifierRequest,
  ) {
    const response = await apiJson<UpdateProductModifierSuccessResponse>(
      menuPaths.productModifierDetail(storeId, productModifierId),
      {
        body: JSON.stringify(input),
        method: 'PATCH',
      },
    );

    return productModifierModel.deserialize(response.data.productModifier);
  },
};
