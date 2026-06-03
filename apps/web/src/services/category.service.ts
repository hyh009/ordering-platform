import { apiJson } from '@/api';
import { menuPaths } from '@/api/paths/menu.paths';
import { categoryModel } from '@/models/category';
import type {
  CategoryActiveFilter,
  CreateCategoryRequest,
  CreateCategorySuccessResponse,
  ListCategoriesSuccessResponse,
  ReorderCategoriesSuccessResponse,
  UpdateCategoryRequest,
  UpdateCategorySuccessResponse,
} from '@/models/category';

function withActiveFilter(path: string, isActive: CategoryActiveFilter) {
  const params = new URLSearchParams({ isActive });

  return `${path}?${params.toString()}`;
}

export const categoryService = {
  async listCategories(storeId: string, isActive: CategoryActiveFilter) {
    const response = await apiJson<ListCategoriesSuccessResponse>(
      withActiveFilter(menuPaths.categories(storeId), isActive),
    );

    return response.data.categories.map(categoryModel.deserialize);
  },

  async createCategory(storeId: string, input: CreateCategoryRequest) {
    const response = await apiJson<CreateCategorySuccessResponse>(
      menuPaths.categories(storeId),
      {
        body: JSON.stringify(input),
        method: 'POST',
      },
    );

    return categoryModel.deserialize(response.data.category);
  },

  async updateCategory(
    storeId: string,
    categoryId: string,
    input: UpdateCategoryRequest,
  ) {
    const response = await apiJson<UpdateCategorySuccessResponse>(
      menuPaths.categoryDetail(storeId, categoryId),
      {
        body: JSON.stringify(input),
        method: 'PATCH',
      },
    );

    return categoryModel.deserialize(response.data.category);
  },

  async reorderCategories(storeId: string, orderedIds: string[]) {
    await apiJson<ReorderCategoriesSuccessResponse>(
      menuPaths.categoryReorder(storeId),
      {
        body: JSON.stringify({ orderedIds }),
        method: 'PATCH',
      },
    );
  },
};
