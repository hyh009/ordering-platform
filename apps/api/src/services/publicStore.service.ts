import { toPublicAllergenDto } from '@src/models/allergen/mapper';
import { toPublicCategoryDto } from '@src/models/category/mapper';
import { toPublicDietaryMarkerDto } from '@src/models/dietaryMarker/mapper';
import { toPublicProductDto } from '@src/models/product/mapper';
import { sortProductsByCategoryOrder } from '@src/models/product/order';
import { toPublicModifierDto } from '@src/models/productModifier/mapper';
import { toPublicStoreDto } from '@src/models/store/mapper';
import { toPublicTagDto } from '@src/models/tag/mapper';
import { allergenRepository } from '@src/repositories/allergen/repository';
import { categoryRepository } from '@src/repositories/category/repository';
import { dietaryMarkerRepository } from '@src/repositories/dietaryMarker/repository';
import { productRepository } from '@src/repositories/product/repository';
import { productModifierRepository } from '@src/repositories/productModifier/repository';
import { storeRepository } from '@src/repositories/store/repository';
import { tagRepository } from '@src/repositories/tag/repository';
import { ERROR_CODES } from '@src/utils/errorCode';
import { NotFoundError } from '@src/utils/errors';

import type { PublicMenuDto, PublicStoreDto } from '@repo/shared';
import type { StoreEntity } from '@src/models/store/model';

function filterReferenced<T extends { id: string }>(
  items: T[],
  ids: Set<string>,
): T[] {
  return items.filter((item) => ids.has(item.id));
}

export async function getActivePublicStore(
  storeId: string,
): Promise<StoreEntity> {
  const store = await storeRepository.findById(storeId);

  if (!store || store.status !== 'active') {
    throw new NotFoundError('Store not found', ERROR_CODES.STORE_NOT_FOUND);
  }

  return store;
}

export async function getPublicStore(storeId: string): Promise<PublicStoreDto> {
  const store = await getActivePublicStore(storeId);
  return toPublicStoreDto(store);
}

export async function getPublicMenu(storeId: string): Promise<PublicMenuDto> {
  await getActivePublicStore(storeId);

  const [products, categories, modifiers, tags, allergens, dietaryMarkers] =
    await Promise.all([
      productRepository.listByStore({ storeId, isActive: true }),
      categoryRepository.listByStore({ storeId, isActive: true }),
      productModifierRepository.listByStore({ storeId, isActive: true }),
      tagRepository.listByStore({ storeId, isActive: true }),
      allergenRepository.list({ isActive: true }),
      dietaryMarkerRepository.list({ isActive: true }),
    ]);

  const visibleProducts = products.filter(
    (product) => product.status === 'published',
  );

  // Group products by category (each product appears under every category it
  // belongs to), ordered per the category's saved productOrder. Categories are
  // already displayOrder-sorted by the repository. Empty categories are dropped;
  // products with no known category go into a trailing null group.
  const groups: PublicMenuDto['groups'] = [];
  for (const category of categories) {
    const members = visibleProducts.filter((product) =>
      product.categoryIds.includes(category.id),
    );
    if (members.length === 0) continue;

    groups.push({
      category: toPublicCategoryDto(category),
      products: sortProductsByCategoryOrder(members, category.productOrder).map(
        toPublicProductDto,
      ),
    });
  }

  const categoryIds = new Set(categories.map((category) => category.id));
  const uncategorized = visibleProducts.filter(
    (product) =>
      !product.categoryIds.some((categoryId) => categoryIds.has(categoryId)),
  );
  if (uncategorized.length > 0) {
    groups.push({
      category: null,
      products: uncategorized.map(toPublicProductDto),
    });
  }

  const referencedModifierIds = new Set(
    visibleProducts.flatMap((product) => product.modifierIds),
  );
  const referencedTagIds = new Set(
    visibleProducts.flatMap((product) => product.tagIds),
  );
  const referencedAllergenIds = new Set(
    visibleProducts.flatMap((product) => product.allergenIds),
  );
  const referencedDietaryMarkerIds = new Set(
    visibleProducts.flatMap((product) => product.dietaryMarkerIds),
  );

  return {
    groups,
    modifiers: filterReferenced(modifiers, referencedModifierIds).map(toPublicModifierDto),
    tags: filterReferenced(tags, referencedTagIds).map(toPublicTagDto),
    allergens: filterReferenced(allergens, referencedAllergenIds).map(toPublicAllergenDto),
    dietaryMarkers: filterReferenced(dietaryMarkers, referencedDietaryMarkerIds).map(toPublicDietaryMarkerDto),
  };
}
