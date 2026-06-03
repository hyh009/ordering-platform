import { toAvailabilityRule } from '@src/models/common/availability.mapper';
import { toProductModifierDto } from '@src/models/productModifier/mapper';
import {
  hasValidProductModifierSelectionBounds,
  type ProductModifierOption,
} from '@src/models/productModifier/model';
import { productModifierRepository } from '@src/repositories/productModifier/repository';
import { ERROR_CODES } from '@src/utils/errorCode';
import { ConflictError, NotFoundError } from '@src/utils/errors';

import type {
  CreateProductModifierRequest,
  ProductModifierActiveFilter,
  ProductModifierDto,
  UpdateProductModifierRequest,
} from '@repo/shared';

function toProductModifierOption(
  option:
    | CreateProductModifierRequest['options'][number]
    | NonNullable<UpdateProductModifierRequest['options']>[number],
  index: number,
): ProductModifierOption {
  return {
    id: `product-modifier-option-${index + 1}`,
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
      displayOrder: input.displayOrder,
      options: input.options.map(toProductModifierOption),
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
        displayOrder: input.displayOrder,
        options: input.options?.map(toProductModifierOption),
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
