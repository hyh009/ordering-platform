import type { LocalizedString } from '@src/models/common/model';

export const promotionStatuses = [
  'draft',
  'active',
  'paused',
  'expired',
] as const;

export type PromotionStatus = (typeof promotionStatuses)[number];

export const promotionDiscountTypes = ['percentage', 'fixed_amount'] as const;

export type PromotionDiscountType = (typeof promotionDiscountTypes)[number];

export const promotionApplicationBases = ['item', 'subtotal'] as const;

export type PromotionApplicationBasis =
  (typeof promotionApplicationBases)[number];

export const promotionTargetScopes = ['order', 'category', 'product'] as const;

export type PromotionTargetScope = (typeof promotionTargetScopes)[number];

export type PromotionOrderTarget = {
  scope: 'order';
  excludedProductIds?: string[];
};

export type PromotionCategoryTarget = {
  scope: 'category';
  categoryIds: string[];
  excludedProductIds?: string[];
};

export type PromotionProductTarget = {
  scope: 'product';
  productIds: string[];
};

export type PromotionTarget =
  | PromotionOrderTarget
  | PromotionCategoryTarget
  | PromotionProductTarget;

export type PromotionEntity = {
  id: string;
  organizationId: string;
  storeId: string;
  name: LocalizedString;
  description?: LocalizedString;
  status: PromotionStatus;
  discountType: PromotionDiscountType;
  discountValue: number;
  applicationBasis: PromotionApplicationBasis;
  minimumSubtotal?: number;
  startsAt: Date;
  endsAt?: Date;
  target: PromotionTarget;
  maxUsageTotal?: number;
  maxUsagePerOrder: number;
  isExclusive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PromotionCreateData = Omit<
  PromotionEntity,
  'createdAt' | 'updatedAt'
>;
