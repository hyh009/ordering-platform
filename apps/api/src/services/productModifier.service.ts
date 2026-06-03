import { randomUUID } from 'node:crypto';

import { toAvailabilityRule } from '@src/models/common/availability.mapper';
import { toProductModifierDto } from '@src/models/productModifier/mapper';
import {
  hasValidProductModifierSelectionBounds,
  type ProductModifierOption,
} from '@src/models/productModifier/model';
import { productModifierRepository } from '@src/repositories/productModifier/repository';
import { ERROR_CODES } from '@src/utils/errorCode';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '@src/utils/errors';

import type {
  CreateProductModifierRequest,
  ProductModifierActiveFilter,
  ProductModifierDto,
  UpdateProductModifierRequest,
} from '@repo/shared';

type ProductModifierOptionInput =
  | CreateProductModifierRequest['options'][number]
  | NonNullable<UpdateProductModifierRequest['options']>[number];

function newProductModifierOptionId() {
  return `product-modifier-option-${randomUUID()}`;
}

function toProductModifierOption(
  option: ProductModifierOptionInput,
  id: string,
): ProductModifierOption {
  return {
    id,
    ...(option.sharedOptionCode !== undefined
      ? { sharedOptionCode: option.sharedOptionCode }
      : {}),
    name: option.name,
    priceAdjustment: option.priceAdjustment,
    isDefault: option.isDefault ?? false,
    isActive: option.isActive ?? true,
    isSoldOut: option.isSoldOut ?? false,
  };
}

// Create always mints fresh option ids; any client-supplied id is ignored.
function buildCreatedOptions(
  options: CreateProductModifierRequest['options'],
): ProductModifierOption[] {
  return options.map((option) =>
    toProductModifierOption(option, newProductModifierOptionId()),
  );
}

// Update preserves the identity of existing options the client sends back by
// id, and mints fresh ids for new options. Unknown or duplicated ids are
// rejected so option references (carts, orders) stay stable.
function buildUpdatedOptions(
  options: NonNullable<UpdateProductModifierRequest['options']>,
  existingOptions: ProductModifierOption[],
): ProductModifierOption[] {
  const existingIds = new Set(existingOptions.map((option) => option.id));
  const seenIds = new Set<string>();

  return options.map((option) => {
    if (option.id === undefined) {
      return toProductModifierOption(option, newProductModifierOptionId());
    }

    if (!existingIds.has(option.id)) {
      throw new BadRequestError(
        `Unknown product modifier option id: ${option.id}`,
        ERROR_CODES.INVALID_FIELD_VALUE,
      );
    }

    if (seenIds.has(option.id)) {
      throw new BadRequestError(
        `Duplicate product modifier option id: ${option.id}`,
        ERROR_CODES.INVALID_FIELD_VALUE,
      );
    }

    seenIds.add(option.id);
    return toProductModifierOption(option, option.id);
  });
}

function assertValidSelectionBounds(input: {
  selectionType: 'single_choice' | 'multiple_choice';
  minSelect: number;
  maxSelect: number;
}) {
  if (!hasValidProductModifierSelectionBounds(input)) {
    throw new ConflictError(
      'Product modifier selection bounds are invalid',
      ERROR_CODES.CONFLICT,
    );
  }
}

export class ProductModifierService {
  public async listProductModifiers(
    storeId: string,
    isActive: ProductModifierActiveFilter,
  ): Promise<ProductModifierDto[]> {
    const productModifiers = await productModifierRepository.listByStore({
      storeId,
      ...(isActive === 'all' ? {} : { isActive: isActive === 'true' }),
    });

    return productModifiers.map(toProductModifierDto);
  }

  public async createProductModifier(
    storeId: string,
    organizationId: string,
    input: CreateProductModifierRequest,
  ): Promise<ProductModifierDto> {
    assertValidSelectionBounds({
      selectionType: input.selectionType,
      minSelect: input.minSelect,
      maxSelect: input.maxSelect,
    });

    const productModifier = await productModifierRepository.create({
      organizationId,
      storeId,
      name: input.name,
      selectionType: input.selectionType,
      minSelect: input.minSelect,
      maxSelect: input.maxSelect,
      options: buildCreatedOptions(input.options),
      inheritCategoryAvailability: input.inheritCategoryAvailability,
      availabilityRules: input.availabilityRules?.map(toAvailabilityRule),
      isActive: input.isActive,
    });

    return toProductModifierDto(productModifier);
  }

  public async updateProductModifier(
    storeId: string,
    productModifierId: string,
    input: UpdateProductModifierRequest,
  ): Promise<ProductModifierDto> {
    const existing =
      await productModifierRepository.findById(productModifierId);

    if (!existing || existing.storeId !== storeId) {
      throw new NotFoundError(
        'Product modifier not found',
        ERROR_CODES.PRODUCT_MODIFIER_NOT_FOUND,
      );
    }

    assertValidSelectionBounds({
      selectionType: input.selectionType ?? existing.selectionType,
      minSelect: input.minSelect ?? existing.minSelect,
      maxSelect: input.maxSelect ?? existing.maxSelect,
    });

    const updated = await productModifierRepository.update(
      productModifierId,
      {
        name: input.name,
        selectionType: input.selectionType,
        minSelect: input.minSelect,
        maxSelect: input.maxSelect,
        options: input.options
          ? buildUpdatedOptions(input.options, existing.options)
          : undefined,
        inheritCategoryAvailability: input.inheritCategoryAvailability,
        availabilityRules: input.availabilityRules?.map(toAvailabilityRule),
        isActive: input.isActive,
      },
      { expectedUpdatedAt: existing.updatedAt },
    );

    if (!updated) {
      throw new ConflictError(
        'Product modifier was updated by another request',
        ERROR_CODES.CONFLICT,
      );
    }

    return toProductModifierDto(updated);
  }
}

export function createProductModifierService() {
  return new ProductModifierService();
}

export const productModifierService = createProductModifierService();
