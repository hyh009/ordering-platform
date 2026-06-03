import type { Category, CategoryDto } from './types';

export const categoryModel = {
  // availabilityRules and the raw imageUrl-less DTO extras are intentionally
  // dropped: the merchant list/form does not consume availability yet (handled
  // server-side, see plan Phase 7).
  deserialize(dto: CategoryDto): Category {
    const category: Category = {
      id: dto.id,
      storeId: dto.storeId,
      name: dto.name,
      displayOrder: dto.displayOrder,
      isActive: dto.isActive,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    };

    if (dto.description !== undefined) {
      category.description = dto.description;
    }

    if (dto.imageUrl !== undefined) {
      category.imageUrl = dto.imageUrl;
    }

    return category;
  },
};

