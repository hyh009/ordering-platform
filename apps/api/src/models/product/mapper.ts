import type { ProductEntity } from './model';
import type { ProductDto, PublicProductDto } from '@repo/shared';

export function toProductDto(product: ProductEntity): ProductDto {
  const dto: ProductDto = {
    id: product.id,
    storeId: product.storeId,
    categoryIds: product.categoryIds,
    name: product.name,
    imageUrls: product.imageUrls,
    price: product.price,
    tagIds: product.tagIds,
    allergenIds: product.allergenIds,
    dietaryMarkerIds: product.dietaryMarkerIds,
    modifierIds: product.modifierIds,
    status: product.status,
    isActive: product.isActive,
    isSoldOut: product.isSoldOut,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };

  if (product.description !== undefined) {
    dto.description = product.description;
  }

  return dto;
}

export function toPublicProductDto(product: ProductEntity): PublicProductDto {
  const dto: PublicProductDto = {
    id: product.id,
    categoryIds: product.categoryIds,
    name: product.name,
    imageUrls: product.imageUrls,
    price: product.price,
    tagIds: product.tagIds,
    allergenIds: product.allergenIds,
    dietaryMarkerIds: product.dietaryMarkerIds,
    modifierIds: product.modifierIds,
    isSoldOut: product.isSoldOut,
  };

  if (product.description !== undefined) {
    dto.description = product.description;
  }

  return dto;
}
