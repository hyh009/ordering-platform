import { productMongoRepository } from '@src/repositories/product/mongo.repository';

import type { LocalizedString } from '@src/models/common/model';
import type { ProductEntity } from '@src/models/product/model';

export type CreateProductInput = {
  organizationId: string;
  storeId: string;
  categoryIds: string[];
  name: LocalizedString;
  description?: LocalizedString | undefined;
  imageUrl?: string | undefined;
  price: number;
  tagIds?: string[] | undefined;
  allergenIds?: string[] | undefined;
  dietaryMarkerIds?: string[] | undefined;
  modifierIds?: string[] | undefined;
  isActive?: boolean | undefined;
};

export type ListProductsByStoreInput = {
  storeId: string;
  isActive?: boolean | undefined;
};

export type UpdateProductInput = {
  categoryIds?: string[] | undefined;
  name?: LocalizedString | undefined;
  description?: LocalizedString | undefined;
  imageUrl?: string | null | undefined;
  price?: number | undefined;
  tagIds?: string[] | undefined;
  allergenIds?: string[] | undefined;
  dietaryMarkerIds?: string[] | undefined;
  modifierIds?: string[] | undefined;
  isActive?: boolean | undefined;
  isSoldOut?: boolean | undefined;
};

export type UpdateProductOptions = {
  expectedUpdatedAt?: Date | undefined;
};

export type ProductRepository = {
  create(input: CreateProductInput): Promise<ProductEntity>;
  findById(productId: string): Promise<ProductEntity | null>;
  listByStore(input: ListProductsByStoreInput): Promise<ProductEntity[]>;
  update(
    productId: string,
    input: UpdateProductInput,
    options?: UpdateProductOptions,
  ): Promise<ProductEntity | null>;
};

export const productRepository: ProductRepository = productMongoRepository;
