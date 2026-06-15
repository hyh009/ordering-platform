import { describe, expect, it } from 'vitest';
import { groupMenuByCategory } from './display';
import type { PublicMenu, PublicProduct } from './types';

function product(id: string, categoryIds: string[]): PublicProduct {
  return {
    id,
    categoryIds,
    name: { en: id },
    imageUrls: [],
    price: 100,
    allergenIds: [],
    dietaryMarkerIds: [],
    modifierIds: [],
    isSoldOut: false,
  };
}

function menu(partial: Partial<PublicMenu>): PublicMenu {
  return {
    categories: [],
    products: [],
    modifiers: [],
    allergens: [],
    dietaryMarkers: [],
    ...partial,
  };
}

describe('groupMenuByCategory', () => {
  it('orders groups by category displayOrder', () => {
    const groups = groupMenuByCategory(
      menu({
        categories: [
          {
            id: 'b',
            name: { en: 'B' },
            displayOrder: 2,
            availabilityRules: [],
          },
          {
            id: 'a',
            name: { en: 'A' },
            displayOrder: 1,
            availabilityRules: [],
          },
        ],
        products: [product('p1', ['a']), product('p2', ['b'])],
      }),
    );

    expect(groups.map((group) => group.category?.id)).toEqual(['a', 'b']);
  });

  it('shows a product in every category it belongs to', () => {
    const groups = groupMenuByCategory(
      menu({
        categories: [
          {
            id: 'a',
            name: { en: 'A' },
            displayOrder: 1,
            availabilityRules: [],
          },
          {
            id: 'b',
            name: { en: 'B' },
            displayOrder: 2,
            availabilityRules: [],
          },
        ],
        products: [product('p1', ['a', 'b'])],
      }),
    );

    expect(groups[0]?.products[0]?.id).toBe('p1');
    expect(groups[1]?.products[0]?.id).toBe('p1');
  });

  it('drops categories with no visible products', () => {
    const groups = groupMenuByCategory(
      menu({
        categories: [
          {
            id: 'a',
            name: { en: 'A' },
            displayOrder: 1,
            availabilityRules: [],
          },
          {
            id: 'empty',
            name: { en: 'Empty' },
            displayOrder: 2,
            availabilityRules: [],
          },
        ],
        products: [product('p1', ['a'])],
      }),
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]?.category?.id).toBe('a');
  });

  it('buckets products with no known category into a trailing null group', () => {
    const groups = groupMenuByCategory(
      menu({
        categories: [
          {
            id: 'a',
            name: { en: 'A' },
            displayOrder: 1,
            availabilityRules: [],
          },
        ],
        products: [
          product('p1', ['a']),
          product('p2', []),
          product('p3', ['gone']),
        ],
      }),
    );

    const last = groups.at(-1);
    expect(last?.category).toBeNull();
    expect(last?.products.map((p) => p.id)).toEqual(['p2', 'p3']);
  });
});
