import type {
  CategoryActiveFilter,
  CategoryDto,
  CreateCategoryRequest,
  CreateCategorySuccessResponse,
  ListCategoriesSuccessResponse,
  LocalizedStringDto,
  ReorderCategoriesSuccessResponse,
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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
