import { toAvailabilityRuleDto } from '@src/models/common/availability.mapper';

import type { CategoryEntity } from './model';
import type { CategoryDto, PublicCategoryDto } from '@repo/shared';

export function toCategoryDto(category: CategoryEntity): CategoryDto {
  const dto: CategoryDto = {
    id: category.id,
    storeId: category.storeId,
    name: category.name,
    displayOrder: category.displayOrder,
    isActive: category.isActive,
    availabilityRules: category.availabilityRules.map(toAvailabilityRuleDto),
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };

  if (category.description !== undefined) {
    dto.description = category.description;
  }

  if (category.imageUrl !== undefined) {
    dto.imageUrl = category.imageUrl;
  }

  return dto;
}

export function toPublicCategoryDto(
  category: CategoryEntity,
): PublicCategoryDto {
  const dto: PublicCategoryDto = {
    id: category.id,
    name: category.name,
    displayOrder: category.displayOrder,
    availabilityRules: category.availabilityRules.map(toAvailabilityRuleDto),
  };

  if (category.description !== undefined) {
    dto.description = category.description;
  }

  if (category.imageUrl !== undefined) {
    dto.imageUrl = category.imageUrl;
  }

  return dto;
}
