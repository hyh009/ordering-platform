import { categoryMongoRepository } from '@src/repositories/category/mongo.repository';

import type { CategoryEntity } from '@src/models/category/model';
import type {
  AvailabilityRule,
  LocalizedString,
} from '@src/models/common/model';

export type CreateCategoryInput = {
  organizationId: string;
  storeId: string;
  name: LocalizedString;
  description?: LocalizedString | undefined;
  imageUrl?: string | undefined;
  displayOrder?: number | undefined;
  isActive?: boolean | undefined;
  availabilityRules?: AvailabilityRule[] | undefined;
};

export type ListCategoriesByStoreInput = {
  storeId: string;
  isActive?: boolean | undefined;
};

export type UpdateCategoryInput = {
  name?: LocalizedString | undefined;
  description?: LocalizedString | undefined;
  imageUrl?: string | null | undefined;
  displayOrder?: number | undefined;
  isActive?: boolean | undefined;
  availabilityRules?: AvailabilityRule[] | undefined;
};

export type CategoryRepository = {
  create(input: CreateCategoryInput): Promise<CategoryEntity>;
  findById(categoryId: string): Promise<CategoryEntity | null>;
  listByStore(input: ListCategoriesByStoreInput): Promise<CategoryEntity[]>;
  update(
    categoryId: string,
    input: UpdateCategoryInput,
  ): Promise<CategoryEntity | null>;
};

export const categoryRepository: CategoryRepository = categoryMongoRepository;
