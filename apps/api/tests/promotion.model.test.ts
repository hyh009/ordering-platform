import { describe, expect, it } from 'vitest';

import {
  createPromotionDataFromTemplateInput,
  getPromotionTemplateDefinition,
  promotionTemplateKinds,
  validatePromotionTemplateInput,
} from '../src/models/promotion/template.js';

import type { PromotionTemplateInput } from '../src/models/promotion/template.js';

describe('promotion model', () => {
  it('defines the supported promotion template kinds', () => {
    expect(promotionTemplateKinds).toEqual([
      'product_discount',
      'category_item_discount',
      'order_threshold_discount',
      'category_threshold_discount',
    ]);
  });

  it('maps promotion templates to their normalized promotion shape', () => {
    expect(getPromotionTemplateDefinition('product_discount')).toMatchObject({
      targetScope: 'product',
      applicationBasis: 'item',
      requiresMinimumSubtotal: false,
      supportsExcludedProductIds: false,
    });
    expect(
      getPromotionTemplateDefinition('category_item_discount'),
    ).toMatchObject({
      targetScope: 'category',
      applicationBasis: 'item',
      requiresMinimumSubtotal: false,
      supportsExcludedProductIds: true,
    });
    expect(
      getPromotionTemplateDefinition('order_threshold_discount'),
    ).toMatchObject({
      targetScope: 'order',
      applicationBasis: 'subtotal',
      requiresMinimumSubtotal: true,
      supportsExcludedProductIds: true,
    });
    expect(
      getPromotionTemplateDefinition('category_threshold_discount'),
    ).toMatchObject({
      targetScope: 'category',
      applicationBasis: 'subtotal',
      requiresMinimumSubtotal: true,
      supportsExcludedProductIds: true,
    });
  });

  it('types supported promotion template inputs', () => {
    const inputs = [
      {
        kind: 'product_discount',
        name: { en: 'Latte discount' },
        discountType: 'fixed_amount',
        discountValue: 20,
        startsAt: new Date('2026-05-18T00:00:00.000Z'),
        productIds: ['product-1'],
      },
      {
        kind: 'category_threshold_discount',
        name: { en: 'Drink threshold discount' },
        discountType: 'percentage',
        discountValue: 0.1,
        startsAt: new Date('2026-05-18T00:00:00.000Z'),
        categoryIds: ['category-1'],
        minimumSubtotal: 300,
      },
    ] satisfies PromotionTemplateInput[];

    expect(inputs).toHaveLength(2);
  });

  it('validates invalid promotion template combinations', () => {
    const validation = validatePromotionTemplateInput({
      kind: 'product_discount',
      name: {},
      discountType: 'percentage',
      discountValue: 1.5,
      startsAt: new Date('2026-05-31T00:00:00.000Z'),
      endsAt: new Date('2026-05-18T00:00:00.000Z'),
      productIds: [],
      excludedProductIds: ['product-1'],
      minimumSubtotal: 300,
      maxUsagePerOrder: 0,
    } as PromotionTemplateInput);

    expect(validation.isValid).toBe(false);
    expect(validation.issues).toEqual(
      expect.arrayContaining([
        {
          field: 'name',
          message: 'name must have at least one localized value',
        },
        {
          field: 'discountValue',
          message: 'percentage discountValue must be between 0 and 1',
        },
        {
          field: 'endsAt',
          message: 'endsAt must be greater than or equal to startsAt',
        },
        {
          field: 'productIds',
          message:
            'productIds must contain at least one non-blank id and no blank ids',
        },
        {
          field: 'excludedProductIds',
          message: 'product_discount does not support excludedProductIds',
        },
        {
          field: 'minimumSubtotal',
          message: 'product_discount does not support minimumSubtotal',
        },
        {
          field: 'maxUsagePerOrder',
          message: 'maxUsagePerOrder must be at least 1',
        },
      ]),
    );
  });

  it('rejects unknown promotion template kinds with field-level issues', () => {
    const validation = validatePromotionTemplateInput({
      kind: 'bogus',
      name: { en: 'Bogus discount' },
      discountType: 'fixed_amount',
      discountValue: 20,
      startsAt: new Date('2026-05-18T00:00:00.000Z'),
    } as unknown as PromotionTemplateInput);

    expect(validation).toEqual({
      isValid: false,
      issues: [
        {
          field: 'kind',
          message: 'kind must be a supported promotion template kind',
        },
      ],
    });
  });

  it('rejects blank target ids in promotion template inputs', () => {
    const productValidation = validatePromotionTemplateInput({
      kind: 'product_discount',
      name: { en: 'Latte discount' },
      discountType: 'fixed_amount',
      discountValue: 20,
      startsAt: new Date('2026-05-18T00:00:00.000Z'),
      productIds: ['product-1', '   '],
    });
    const categoryValidation = validatePromotionTemplateInput({
      kind: 'category_threshold_discount',
      name: { en: 'Drink threshold discount' },
      discountType: 'fixed_amount',
      discountValue: 30,
      startsAt: new Date('2026-05-18T00:00:00.000Z'),
      categoryIds: ['category-1', ''],
      excludedProductIds: ['product-1', ' '],
      minimumSubtotal: 300,
    });

    expect(productValidation.issues).toContainEqual({
      field: 'productIds',
      message:
        'productIds must contain at least one non-blank id and no blank ids',
    });
    expect(categoryValidation.issues).toEqual(
      expect.arrayContaining([
        {
          field: 'categoryIds',
          message:
            'categoryIds must contain at least one non-blank id and no blank ids',
        },
        {
          field: 'excludedProductIds',
          message: 'excludedProductIds must contain no blank ids',
        },
      ]),
    );
  });

  it('maps product template input to normalized promotion create data', () => {
    const promotionData = createPromotionDataFromTemplateInput({
      id: 'promotion-1',
      organizationId: 'org-1',
      input: {
        kind: 'product_discount',
        name: { en: 'Latte discount' },
        discountType: 'fixed_amount',
        discountValue: 20,
        startsAt: new Date('2026-05-18T00:00:00.000Z'),
        productIds: [' product-1 '],
      },
    });

    expect(promotionData).toMatchObject({
      id: 'promotion-1',
      organizationId: 'org-1',
      status: 'draft',
      applicationBasis: 'item',
      maxUsagePerOrder: 1,
      isExclusive: false,
      target: {
        scope: 'product',
        productIds: ['product-1'],
      },
    });
    expect(promotionData.minimumSubtotal).toBeUndefined();
  });

  it('maps category threshold template input to subtotal promotion create data', () => {
    const promotionData = createPromotionDataFromTemplateInput({
      id: 'promotion-1',
      organizationId: 'org-1',
      input: {
        kind: 'category_threshold_discount',
        name: { en: 'Drink threshold discount' },
        discountType: 'percentage',
        discountValue: 0.1,
        startsAt: new Date('2026-05-18T00:00:00.000Z'),
        categoryIds: ['category-1'],
        excludedProductIds: ['product-1'],
        minimumSubtotal: 300,
        maxUsageTotal: 100,
        maxUsagePerOrder: 2,
        isExclusive: true,
      },
    });

    expect(promotionData).toMatchObject({
      applicationBasis: 'subtotal',
      minimumSubtotal: 300,
      maxUsageTotal: 100,
      maxUsagePerOrder: 2,
      isExclusive: true,
      target: {
        scope: 'category',
        categoryIds: ['category-1'],
        excludedProductIds: ['product-1'],
      },
    });
  });
});
