import type { ProductEntity } from './model';
import type { ProductDto } from '@repo/shared';

export function toProductDto(product: ProductEntity): ProductDto {
  const dto: ProductDto = {
    id: product.id,
    storeId: product.storeId,
    categoryIds: product.categoryIds,
    name: product.name,
    price: product.price,
    tagIds: product.tagIds,
    allergenIds: product.allergenIds,
    dietaryMarkerIds: product.dietaryMarkerIds,
    modifierIds: product.modifierIds,
    isActive: product.isActive,
    isSoldOut: product.isSoldOut,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };

  if (product.description !== undefined) {
    dto.description = product.description;
  }

  if (product.imageUrl !== undefined) {
    dto.imageUrl = product.imageUrl;
  }

  return dto;
}
