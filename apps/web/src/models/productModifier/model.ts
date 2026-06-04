import type { ProductModifier, ProductModifierDto, ProductModifierOption, ProductModifierOptionDto } from './types';

function deserializeOption(dto: ProductModifierOptionDto): ProductModifierOption {
  return {
    id: dto.id,
    ...(dto.sharedOptionCode !== undefined && { sharedOptionCode: dto.sharedOptionCode }),
    name: dto.name,
    priceAdjustment: dto.priceAdjustment,
    isDefault: dto.isDefault,
    isActive: dto.isActive,
    isSoldOut: dto.isSoldOut,
  };
}

export const productModifierModel = {
  // availabilityRules and inheritCategoryAvailability are deferred to Phase 7.
  deserialize(dto: ProductModifierDto): ProductModifier {
    return {
      id: dto.id,
      storeId: dto.storeId,
      name: dto.name,
      selectionType: dto.selectionType,
      minSelect: dto.minSelect,
      maxSelect: dto.maxSelect,
      options: dto.options.map(deserializeOption),
      isActive: dto.isActive,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    };
  },
};
