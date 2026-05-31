import { describe, expect, it } from 'vitest';

import { PromotionMongoModel } from '../src/models/promotion/mongo.js';

import type { PromotionTarget } from '../src/models/promotion/model.js';

describe('promotion Mongo model', () => {
  it('accepts a store-owned order promotion', () => {
    const target = {
      scope: 'order',
      excludedProductIds: ['product-excluded'],
    } satisfies PromotionTarget;

    const promotion = new PromotionMongoModel({
      id: 'promotion-1',
      organizationId: 'org-1',
      storeId: 'store-1',
      name: {
        en: 'Lunch discount',
      },
      description: {
        'zh-TW': '午餐優惠',
      },
      status: 'active',
      discountType: 'percentage',
      discountValue: 0.1,
      applicationBasis: 'subtotal',
      minimumSubtotal: 200,
      startsAt: new Date('2026-05-18T00:00:00.000Z'),
      endsAt: new Date('2026-05-31T23:59:59.999Z'),
      target,
      maxUsageTotal: 100,
      maxUsagePerOrder: 1,
      isExclusive: true,
    });

    expect(promotion.validateSync()).toBeUndefined();
  });

  it('accepts category and product scoped promotions', () => {
    const categoryTarget = {
      scope: 'category',
      categoryIds: ['category-1'],
    } satisfies PromotionTarget;
    const productTarget = {
      scope: 'product',
      productIds: ['product-1'],
    } satisfies PromotionTarget;

    const categoryPromotion = new PromotionMongoModel({
      id: 'promotion-1',
      organizationId: 'org-1',
      storeId: 'store-1',
      name: {
        en: 'Drinks discount',
      },
      discountType: 'fixed_amount',
      discountValue: 20,
      applicationBasis: 'item',
      startsAt: new Date('2026-05-18T00:00:00.000Z'),
      target: categoryTarget,
    });
    const productPromotion = new PromotionMongoModel({
      id: 'promotion-2',
      organizationId: 'org-1',
      storeId: 'store-1',
      name: {
        en: 'Latte discount',
      },
      discountType: 'percentage',
      discountValue: 0.15,
      applicationBasis: 'item',
      startsAt: new Date('2026-05-18T00:00:00.000Z'),
      target: productTarget,
    });

    expect(categoryPromotion.validateSync()).toBeUndefined();
    expect(productPromotion.validateSync()).toBeUndefined();
    expect(categoryPromotion.status).toBe('draft');
    expect(categoryPromotion.maxUsagePerOrder).toBe(1);
    expect(categoryPromotion.isExclusive).toBe(false);
  });

  it('keeps unrelated promotion target id arrays unset', () => {
    const promotion = new PromotionMongoModel({
      id: 'promotion-1',
      organizationId: 'org-1',
      storeId: 'store-1',
      name: {
        en: 'Lunch discount',
      },
      discountType: 'percentage',
      discountValue: 0.1,
      applicationBasis: 'subtotal',
      startsAt: new Date('2026-05-18T00:00:00.000Z'),
      target: {
        scope: 'order',
      },
    });

    expect(promotion.validateSync()).toBeUndefined();
    expect(promotion.target.categoryIds).toBeUndefined();
    expect(promotion.target.productIds).toBeUndefined();
    expect(promotion.target.excludedProductIds).toBeUndefined();
  });

  it('requires localized promotion names', () => {
    const promotion = new PromotionMongoModel({
      id: 'promotion-1',
      organizationId: 'org-1',
      storeId: 'store-1',
      name: {},
      discountType: 'fixed_amount',
      discountValue: 20,
      applicationBasis: 'subtotal',
      startsAt: new Date('2026-05-18T00:00:00.000Z'),
      target: {
        scope: 'order',
      },
    });

    expect(promotion.validateSync()?.errors.name?.message).toBe(
      'name must have at least one localized value',
    );
  });

  it('validates percentage discount value', () => {
    const promotion = new PromotionMongoModel({
      id: 'promotion-1',
      organizationId: 'org-1',
      storeId: 'store-1',
      name: {
        en: 'Invalid discount',
      },
      discountType: 'percentage',
      discountValue: 1.5,
      applicationBasis: 'subtotal',
      startsAt: new Date('2026-05-18T00:00:00.000Z'),
      target: {
        scope: 'order',
      },
    });

    expect(promotion.validateSync()?.errors.discountValue?.message).toBe(
      'percentage promotion discountValue must be between 0 and 1',
    );
  });

  it('validates promotion date order', () => {
    const promotion = new PromotionMongoModel({
      id: 'promotion-1',
      organizationId: 'org-1',
      storeId: 'store-1',
      name: {
        en: 'Invalid date range',
      },
      discountType: 'fixed_amount',
      discountValue: 20,
      applicationBasis: 'subtotal',
      startsAt: new Date('2026-05-31T00:00:00.000Z'),
      endsAt: new Date('2026-05-18T00:00:00.000Z'),
      target: {
        scope: 'order',
      },
    });

    expect(promotion.validateSync()?.errors.endsAt?.message).toBe(
      'endsAt must be greater than or equal to startsAt',
    );
  });

  it('validates promotion target ids match target scope', () => {
    const promotion = new PromotionMongoModel({
      id: 'promotion-1',
      organizationId: 'org-1',
      storeId: 'store-1',
      name: {
        en: 'Invalid target',
      },
      discountType: 'fixed_amount',
      discountValue: 20,
      applicationBasis: 'item',
      startsAt: new Date('2026-05-18T00:00:00.000Z'),
      target: {
        scope: 'category',
        productIds: ['product-1'],
      },
    });

    expect(promotion.validateSync()?.errors['target.scope']?.message).toBe(
      'promotion target ids must match scope: order uses no target ids, category uses categoryIds, product uses only productIds',
    );
  });

  it('requires category or product ids for scoped promotion targets', () => {
    const categoryPromotion = new PromotionMongoModel({
      id: 'promotion-1',
      organizationId: 'org-1',
      storeId: 'store-1',
      name: {
        en: 'Invalid category target',
      },
      discountType: 'fixed_amount',
      discountValue: 20,
      applicationBasis: 'item',
      startsAt: new Date('2026-05-18T00:00:00.000Z'),
      target: {
        scope: 'category',
      },
    });
    const productPromotion = new PromotionMongoModel({
      id: 'promotion-2',
      organizationId: 'org-1',
      storeId: 'store-1',
      name: {
        en: 'Invalid product target',
      },
      discountType: 'fixed_amount',
      discountValue: 20,
      applicationBasis: 'item',
      startsAt: new Date('2026-05-18T00:00:00.000Z'),
      target: {
        scope: 'product',
      },
    });

    expect(
      categoryPromotion.validateSync()?.errors['target.scope']?.message,
    ).toBe(
      'promotion target ids must match scope: order uses no target ids, category uses categoryIds, product uses only productIds',
    );
    expect(
      productPromotion.validateSync()?.errors['target.scope']?.message,
    ).toBe(
      'promotion target ids must match scope: order uses no target ids, category uses categoryIds, product uses only productIds',
    );
  });

  it('does not allow product scoped promotions to exclude products', () => {
    const promotion = new PromotionMongoModel({
      id: 'promotion-1',
      organizationId: 'org-1',
      storeId: 'store-1',
      name: {
        en: 'Invalid product target',
      },
      discountType: 'fixed_amount',
      discountValue: 20,
      applicationBasis: 'item',
      startsAt: new Date('2026-05-18T00:00:00.000Z'),
      target: {
        scope: 'product',
        productIds: ['product-1'],
        excludedProductIds: ['product-1'],
      },
    });

    expect(promotion.validateSync()?.errors['target.scope']?.message).toBe(
      'promotion target ids must match scope: order uses no target ids, category uses categoryIds, product uses only productIds',
    );
  });

  it('validates promotion application basis rules', () => {
    const orderItemPromotion = new PromotionMongoModel({
      id: 'promotion-1',
      organizationId: 'org-1',
      storeId: 'store-1',
      name: {
        en: 'Invalid order basis',
      },
      discountType: 'fixed_amount',
      discountValue: 20,
      applicationBasis: 'item',
      startsAt: new Date('2026-05-18T00:00:00.000Z'),
      target: {
        scope: 'order',
      },
    });
    const itemThresholdPromotion = new PromotionMongoModel({
      id: 'promotion-2',
      organizationId: 'org-1',
      storeId: 'store-1',
      name: {
        en: 'Invalid threshold basis',
      },
      discountType: 'fixed_amount',
      discountValue: 20,
      applicationBasis: 'item',
      minimumSubtotal: 300,
      startsAt: new Date('2026-05-18T00:00:00.000Z'),
      target: {
        scope: 'category',
        categoryIds: ['category-1'],
      },
    });

    expect(
      orderItemPromotion.validateSync()?.errors.applicationBasis?.message,
    ).toBe(
      'promotion applicationBasis must be subtotal for order or minimum-subtotal discounts',
    );
    expect(
      itemThresholdPromotion.validateSync()?.errors.applicationBasis?.message,
    ).toBe(
      'promotion applicationBasis must be subtotal for order or minimum-subtotal discounts',
    );
  });
});
