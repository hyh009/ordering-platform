import type {
  CreateProductRequest,
  CreateProductSuccessResponse,
  GetProductSuccessResponse,
  ListProductsSuccessResponse,
  LocalizedStringDto,
  ProductActiveFilter,
  ProductDto,
  ProductStatus,
  ToggleProductSoldOutRequest,
  ToggleProductSoldOutSuccessResponse,
  UpdateProductRequest,
  UpdateProductSuccessResponse,
} from '@repo/shared';

export type {
  CreateProductRequest,
  CreateProductSuccessResponse,
  GetProductSuccessResponse,
  ListProductsSuccessResponse,
  LocalizedStringDto,
  ProductActiveFilter,
  ProductDto,
  ProductStatus,
  ToggleProductSoldOutRequest,
  ToggleProductSoldOutSuccessResponse,
  UpdateProductRequest,
  UpdateProductSuccessResponse,
};

export type Product = {
  id: string;
  storeId: string;
  categoryIds: string[];
  name: LocalizedStringDto;
  description?: LocalizedStringDto;
  imageUrls: string[];
  price: number;
  tagIds: string[];
  allergenIds: string[];
  dietaryMarkerIds: string[];
  modifierIds: string[];
  status: ProductStatus;
  isActive: boolean;
  isSoldOut: boolean;
  createdAt: string;
  updatedAt: string;
};
