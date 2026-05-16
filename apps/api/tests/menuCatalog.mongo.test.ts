import { describe, expect, it } from 'vitest';

import { AllergenMongoModel } from '../src/models/allergen/mongo.js';
import { CategoryMongoModel } from '../src/models/category/mongo.js';
import { DietaryMarkerMongoModel } from '../src/models/dietaryMarker/mongo.js';
import { ProductMongoModel } from '../src/models/product/mongo.js';
import { ProductModifierMongoModel } from '../src/models/productModifier/mongo.js';
import { TagMongoModel } from '../src/models/tag/mongo.js';

describe('menu catalog Mongo models', () => {
  it('accepts an organization-owned category', () => {
    const category = new CategoryMongoModel({
      id: 'category-1',
      organizationId: 'org-1',
      name: {
        en: 'Coffee',
      },
      description: {
        'zh-TW': '咖啡',
      },
      imageUrl: 'https://example.com/coffee.png',
      displayOrder: 10,
      isActive: true,
      availabilityRules: [
        {
          daysOfWeek: [1, 2, 3, 4, 5],
          timeWindows: [
            {
              start: '09:00',
              end: '17:00',
            },
          ],
        },
      ],
    });

    expect(category.validateSync()).toBeUndefined();
  });

  it('accepts an organization-owned marketing tag', () => {
    const tag = new TagMongoModel({
      id: 'tag-1',
      organizationId: 'org-1',
      name: {
        en: 'Popular',
      },
      color: '#f97316',
      displayOrder: 1,
      isActive: true,
    });

    expect(tag.validateSync()).toBeUndefined();
  });

  it('accepts a global dietary marker', () => {
    const marker = new DietaryMarkerMongoModel({
      id: 'dietary-marker-1',
      key: 'vegetarian',
      name: {
        en: 'Vegetarian',
        'zh-TW': '素食',
      },
      icon: 'leaf',
      type: 'dietary',
      isActive: true,
    });

    expect(marker.validateSync()).toBeUndefined();
  });

  it('accepts a global allergen', () => {
    const allergen = new AllergenMongoModel({
      id: 'allergen-1',
      key: 'peanut',
      name: {
        en: 'Peanut',
        'zh-TW': '花生',
      },
      icon: 'nut',
      isActive: true,
    });

    expect(allergen.validateSync()).toBeUndefined();
  });

  it('accepts an organization-owned product modifier', () => {
    const modifier = new ProductModifierMongoModel({
      id: 'modifier-1',
      organizationId: 'org-1',
      name: {
        en: 'Milk',
      },
      selectionType: 'single_choice',
      minSelect: 1,
      maxSelect: 1,
      options: [
        {
          id: 'modifier-option-1',
          sharedOptionCode: 'oat-milk',
          name: {
            en: 'Oat milk',
          },
          priceAdjustment: 15,
          isDefault: false,
          isActive: true,
          isSoldOut: false,
        },
      ],
      inheritCategoryAvailability: true,
      availabilityRules: [],
      isActive: true,
    });

    expect(modifier.validateSync()).toBeUndefined();
  });

  it('accepts an organization-owned product', () => {
    const product = new ProductMongoModel({
      id: 'product-1',
      organizationId: 'org-1',
      categoryId: 'category-1',
      name: {
        en: 'Latte',
      },
      description: {
        'zh-TW': '拿鐵',
      },
      imageUrl: 'https://example.com/latte.png',
      price: 120,
      tagIds: ['tag-1'],
      allergenIds: ['allergen-1'],
      dietaryMarkerIds: ['dietary-marker-1'],
      modifierIds: ['modifier-1'],
      inheritCategoryAvailability: true,
      availabilityRules: [],
      isActive: true,
      isSoldOut: false,
    });

    expect(product.validateSync()).toBeUndefined();
  });

  it('requires localized names', () => {
    const category = new CategoryMongoModel({
      id: 'category-1',
      organizationId: 'org-1',
      name: {},
    });

    expect(category.validateSync()?.errors.name?.message).toBe(
      'name must have at least one localized value',
    );
  });

  it('validates dietary marker type', () => {
    const marker = new DietaryMarkerMongoModel({
      id: 'dietary-marker-1',
      key: 'vegetarian',
      name: {
        en: 'Vegetarian',
      },
      type: 'unknown',
    });

    expect(marker.validateSync()?.errors.type?.message).toContain(
      '`unknown` is not a valid enum value',
    );
  });

  it('validates availability days of week', () => {
    const category = new CategoryMongoModel({
      id: 'category-1',
      organizationId: 'org-1',
      name: {
        en: 'Coffee',
      },
      availabilityRules: [
        {
          daysOfWeek: [7],
        },
      ],
    });

    const errors = category.validateSync()?.errors;

    expect(errors?.['availabilityRules.0.daysOfWeek']?.message).toContain(
      'daysOfWeek must contain numbers between 0 and 6',
    );
  });

  it('validates product modifier selection range', () => {
    const modifier = new ProductModifierMongoModel({
      id: 'modifier-1',
      organizationId: 'org-1',
      name: {
        en: 'Toppings',
      },
      selectionType: 'multiple_choice',
      minSelect: 3,
      maxSelect: 2,
      options: [
        {
          id: 'modifier-option-1',
          name: {
            en: 'Pearl',
          },
        },
      ],
    });

    expect(modifier.validateSync()?.errors.maxSelect?.message).toBe(
      'maxSelect must be greater than or equal to minSelect',
    );
  });

  it('defaults modifier option sold-out state to false', () => {
    const modifier = new ProductModifierMongoModel({
      id: 'modifier-1',
      organizationId: 'org-1',
      name: {
        en: 'Toppings',
      },
      selectionType: 'multiple_choice',
      minSelect: 0,
      maxSelect: 2,
      options: [
        {
          id: 'modifier-option-1',
          sharedOptionCode: 'pearl',
          name: {
            en: 'Pearl',
          },
        },
      ],
    });

    expect(modifier.validateSync()).toBeUndefined();
    expect(modifier.options[0]?.isSoldOut).toBe(false);
  });

  it('validates single choice product modifier max selection', () => {
    const modifier = new ProductModifierMongoModel({
      id: 'modifier-1',
      organizationId: 'org-1',
      name: {
        en: 'Size',
      },
      selectionType: 'single_choice',
      minSelect: 0,
      maxSelect: 2,
      options: [
        {
          id: 'modifier-option-1',
          name: {
            en: 'Large',
          },
        },
      ],
    });

    expect(modifier.validateSync()?.errors.selectionType?.message).toBe(
      'single_choice modifiers must have maxSelect equal to 1',
    );
  });

  it('validates product price cannot be negative', () => {
    const product = new ProductMongoModel({
      id: 'product-1',
      organizationId: 'org-1',
      categoryId: 'category-1',
      name: {
        en: 'Latte',
      },
      price: -1,
    });

    expect(product.validateSync()?.errors.price?.message).toContain(
      'Path `price` (-1) is less than minimum allowed value (0)',
    );
  });
});
