import type {
  BusinessHourDto,
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

/**
 * Display-only open check using the browser clock (stores are Taiwan-local for
 * MVP). The backend stays the enforcement point at create/add/submit time.
 */
export function isStoreOpenNow(
  businessHours: BusinessHourDto[],
  now: Date = new Date(),
): boolean {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const dayOfWeek = now.getDay();
  const previousDay = (dayOfWeek + 6) % 7;

  const parse = (time: string | undefined) => {
    if (!time) return undefined;
    const [hours = 0, mins = 0] = time.split(':').map(Number);
    return hours * 60 + mins;
  };

  return businessHours.some((entry) => {
    if (!entry.isOpen) return false;

    const open = parse(entry.openTime);
    const close = parse(entry.closeTime);

    if (entry.dayOfWeek === dayOfWeek) {
      if (open === undefined || close === undefined) return true;
      if (open < close) return minutes >= open && minutes < close;
      return minutes >= open;
    }

    if (entry.dayOfWeek === previousDay) {
      if (open === undefined || close === undefined) return false;
      return open >= close && minutes < close;
    }

    return false;
  });
}
