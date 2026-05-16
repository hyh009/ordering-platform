import { describe, expect, it } from 'vitest';

import { AllergenMongoModel } from '../src/models/allergen/mongo.js';
import { CategoryMongoModel } from '../src/models/category/mongo.js';
import { DietaryMarkerMongoModel } from '../src/models/dietaryMarker/mongo.js';
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
});
