import type { Product, ProductDto } from './types';

export const productModel = {
  deserialize(dto: ProductDto): Product {
    const product: Product = {
      id: dto.id,
      storeId: dto.storeId,
      categoryIds: dto.categoryIds,
      name: dto.name,
      imageUrls: dto.imageUrls,
      price: dto.price,
      tagIds: dto.tagIds,
      allergenIds: dto.allergenIds,
      dietaryMarkerIds: dto.dietaryMarkerIds,
      modifierIds: dto.modifierIds,
      status: dto.status,
      isActive: dto.isActive,
      isSoldOut: dto.isSoldOut,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    };

    if (dto.description !== undefined) {
      product.description = dto.description;
    }

    return product;
  },
};
