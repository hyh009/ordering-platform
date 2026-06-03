import { toAvailabilityRuleDto } from '@src/models/common/availability.mapper';

import type { ProductModifierEntity, ProductModifierOption } from './model';
import type {
  ProductModifierDto,
  ProductModifierOptionDto,
} from '@repo/shared';

function toProductModifierOptionDto(
  option: ProductModifierOption,
): ProductModifierOptionDto {
  const dto: ProductModifierOptionDto = {
    id: option.id,
    name: option.name,
    priceAdjustment: option.priceAdjustment,
    isDefault: option.isDefault,
    isActive: option.isActive,
    isSoldOut: option.isSoldOut,
  };

  if (option.sharedOptionCode !== undefined) {
    dto.sharedOptionCode = option.sharedOptionCode;
  }

  return dto;
}

export function toProductModifierDto(
  productModifier: ProductModifierEntity,
): ProductModifierDto {
  return {
    id: productModifier.id,
    storeId: productModifier.storeId,
    name: productModifier.name,
    selectionType: productModifier.selectionType,
    minSelect: productModifier.minSelect,
    maxSelect: productModifier.maxSelect,
    options: productModifier.options.map(toProductModifierOptionDto),
    inheritCategoryAvailability: productModifier.inheritCategoryAvailability,
    availabilityRules: productModifier.availabilityRules.map(
      toAvailabilityRuleDto,
    ),
    isActive: productModifier.isActive,
    createdAt: productModifier.createdAt.toISOString(),
    updatedAt: productModifier.updatedAt.toISOString(),
  };
}
