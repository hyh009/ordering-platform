import type {
  MenuCategoryGroup,
  PublicMenu,
  PublicModifier,
} from './types';

/**
 * Groups the flat menu for display. A product appears under every category it
 * belongs to; products without a category go into a trailing `category: null`
 * bucket. Categories without visible products are dropped.
 */
export function groupMenuByCategory(menu: PublicMenu): MenuCategoryGroup[] {
  const sortedCategories = [...menu.categories].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );

  const groups: MenuCategoryGroup[] = [];

  for (const category of sortedCategories) {
    const products = menu.products.filter((product) =>
      product.categoryIds.includes(category.id),
    );
    if (products.length > 0) {
      groups.push({ category, products });
    }
  }

  const categoryIds = new Set(menu.categories.map((category) => category.id));
  const uncategorized = menu.products.filter(
    (product) =>
      !product.categoryIds.some((categoryId) => categoryIds.has(categoryId)),
  );
  if (uncategorized.length > 0) {
    groups.push({ category: null, products: uncategorized });
  }

  return groups;
}

export function buildModifierMap(
  modifiers: PublicModifier[],
): Map<string, PublicModifier> {
  return new Map(modifiers.map((modifier) => [modifier.id, modifier]));
}
