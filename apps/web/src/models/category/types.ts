import type {
  CategoryActiveFilter,
  CategoryDto,
  CreateCategoryRequest,
  CreateCategorySuccessResponse,
  ListCategoriesSuccessResponse,
  LocalizedStringDto,
  ReorderCategoriesSuccessResponse,
  ReorderCategoryProductsSuccessResponse,
  UpdateCategoryRequest,
  UpdateCategorySuccessResponse,
} from '@repo/shared';

export type {
  CategoryActiveFilter,
  CategoryDto,
  CreateCategoryRequest,
  CreateCategorySuccessResponse,
  ListCategoriesSuccessResponse,
  LocalizedStringDto,
  ReorderCategoriesSuccessResponse,
  ReorderCategoryProductsSuccessResponse,
  UpdateCategoryRequest,
  UpdateCategorySuccessResponse,
};

export type Category = {
  id: string;
  storeId: string;
  name: LocalizedStringDto;
  description?: LocalizedStringDto;
  imageUrl?: string;
  displayOrder: number;
  productOrder: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
