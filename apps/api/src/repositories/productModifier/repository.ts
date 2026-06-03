import { productModifierMongoRepository } from '@src/repositories/productModifier/mongo.repository';

import type {
  AvailabilityRule,
  LocalizedString,
} from '@src/models/common/model';
import type {
  ProductModifierEntity,
  ProductModifierOption,
  ProductModifierSelectionType,
} from '@src/models/productModifier/model';

export type CreateProductModifierInput = {
  organizationId: string;
  storeId: string;
  name: LocalizedString;
  selectionType: ProductModifierSelectionType;
  minSelect: number;
  maxSelect: number;
  displayOrder?: number | undefined;
  options: ProductModifierOption[];
  inheritCategoryAvailability?: boolean | undefined;
  availabilityRules?: AvailabilityRule[] | undefined;
  isActive?: boolean | undefined;
};

export type ListProductModifiersByStoreInput = {
  storeId: string;
  isActive?: boolean | undefined;
};

export type UpdateProductModifierInput = {
  name?: LocalizedString | undefined;
  selectionType?: ProductModifierSelectionType | undefined;
  minSelect?: number | undefined;
  maxSelect?: number | undefined;
  displayOrder?: number | undefined;
  options?: ProductModifierOption[] | undefined;
  inheritCategoryAvailability?: boolean | undefined;
  availabilityRules?: AvailabilityRule[] | undefined;
  isActive?: boolean | undefined;
};

export type UpdateProductModifierOptions = {
  expectedUpdatedAt?: Date | undefined;
};

export type ProductModifierRepository = {
  create(input: CreateProductModifierInput): Promise<ProductModifierEntity>;
  findById(productModifierId: string): Promise<ProductModifierEntity | null>;
  listByStore(
    input: ListProductModifiersByStoreInput,
  ): Promise<ProductModifierEntity[]>;
  update(
    productModifierId: string,
    input: UpdateProductModifierInput,
    options?: UpdateProductModifierOptions,
  ): Promise<ProductModifierEntity | null>;
};

export const productModifierRepository: ProductModifierRepository =
  productModifierMongoRepository;
