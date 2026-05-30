import { hasAnyLocalizedValue } from '@src/models/common/model';
import {
  promotionDiscountTypes,
  type PromotionApplicationBasis,
  type PromotionCreateData,
  type PromotionDiscountType,
  type PromotionTarget,
  type PromotionTargetScope,
} from '@src/models/promotion/model';

import type { LocalizedString } from '@src/models/common/model';

export const promotionTemplateKinds = [
  'product_discount',
  'category_item_discount',
  'order_threshold_discount',
  'category_threshold_discount',
] as const;

export type PromotionTemplateKind = (typeof promotionTemplateKinds)[number];

export type PromotionTemplateDefinition = {
  kind: PromotionTemplateKind;
  targetScope: PromotionTargetScope;
  applicationBasis: PromotionApplicationBasis;
  requiresMinimumSubtotal: boolean;
  supportsExcludedProductIds: boolean;
};

export const promotionTemplateDefinitions = {
  product_discount: {
    kind: 'product_discount',
    targetScope: 'product',
    applicationBasis: 'item',
    requiresMinimumSubtotal: false,
    supportsExcludedProductIds: false,
  },
  category_item_discount: {
    kind: 'category_item_discount',
    targetScope: 'category',
    applicationBasis: 'item',
    requiresMinimumSubtotal: false,
    supportsExcludedProductIds: true,
  },
  order_threshold_discount: {
    kind: 'order_threshold_discount',
    targetScope: 'order',
    applicationBasis: 'subtotal',
    requiresMinimumSubtotal: true,
    supportsExcludedProductIds: true,
  },
  category_threshold_discount: {
    kind: 'category_threshold_discount',
    targetScope: 'category',
    applicationBasis: 'subtotal',
    requiresMinimumSubtotal: true,
    supportsExcludedProductIds: true,
  },
} satisfies Record<PromotionTemplateKind, PromotionTemplateDefinition>;

export function getPromotionTemplateDefinition(kind: PromotionTemplateKind) {
  return promotionTemplateDefinitions[kind];
}

type PromotionTemplateBaseInput = {
  name: LocalizedString;
  description?: LocalizedString;
  discountType: PromotionDiscountType;
  discountValue: number;
  startsAt: Date;
  endsAt?: Date;
  maxUsageTotal?: number;
  maxUsagePerOrder?: number;
  isExclusive?: boolean;
};

export type ProductDiscountPromotionTemplateInput =
  PromotionTemplateBaseInput & {
    kind: 'product_discount';
    productIds: string[];
  };

export type CategoryItemDiscountPromotionTemplateInput =
  PromotionTemplateBaseInput & {
    kind: 'category_item_discount';
    categoryIds: string[];
    excludedProductIds?: string[];
  };

export type OrderThresholdDiscountPromotionTemplateInput =
  PromotionTemplateBaseInput & {
    kind: 'order_threshold_discount';
    minimumSubtotal: number;
    excludedProductIds?: string[];
  };

export type CategoryThresholdDiscountPromotionTemplateInput =
  PromotionTemplateBaseInput & {
    kind: 'category_threshold_discount';
    categoryIds: string[];
    minimumSubtotal: number;
    excludedProductIds?: string[];
  };

export type PromotionTemplateInput =
  | ProductDiscountPromotionTemplateInput
  | CategoryItemDiscountPromotionTemplateInput
  | OrderThresholdDiscountPromotionTemplateInput
  | CategoryThresholdDiscountPromotionTemplateInput;

export type PromotionTemplateValidationIssue = {
  field: string;
  message: string;
};

export type PromotionTemplateValidationResult = {
  isValid: boolean;
  issues: PromotionTemplateValidationIssue[];
};

export type CreatePromotionDataFromTemplateInput = {
  id: string;
  organizationId: string;
  storeId: string;
  input: PromotionTemplateInput;
};

function isPositiveInteger(value: number | undefined) {
  return value === undefined || (Number.isInteger(value) && value >= 1);
}

function isValidDate(value: Date | undefined) {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function hasRequiredNonBlankIds(ids: string[] | undefined) {
  return (
    Array.isArray(ids) &&
    ids.length > 0 &&
    ids.every((id) => typeof id === 'string' && id.trim().length > 0)
  );
}

function hasOnlyNonBlankIds(ids: string[] | undefined) {
  return (
    ids === undefined ||
    (Array.isArray(ids) &&
      ids.every((id) => typeof id === 'string' && id.trim().length > 0))
  );
}

function normalizeIds(ids: string[]) {
  return ids.map((id) => id.trim());
}

function isPromotionTemplateKind(
  value: unknown,
): value is PromotionTemplateKind {
  return promotionTemplateKinds.includes(value as PromotionTemplateKind);
}

function hasOwnField(input: object, field: string) {
  return Object.prototype.hasOwnProperty.call(input, field);
}

function pushIssue(
  issues: PromotionTemplateValidationIssue[],
  field: string,
  message: string,
) {
  issues.push({ field, message });
}

export function validatePromotionTemplateInput(
  input: PromotionTemplateInput,
): PromotionTemplateValidationResult {
  const issues: PromotionTemplateValidationIssue[] = [];
  const kind = input.kind;

  if (!hasAnyLocalizedValue(input.name)) {
    pushIssue(issues, 'name', 'name must have at least one localized value');
  }

  if (!promotionDiscountTypes.includes(input.discountType)) {
    pushIssue(
      issues,
      'discountType',
      'discountType must be percentage or fixed_amount',
    );
  }

  if (!Number.isFinite(input.discountValue) || input.discountValue < 0) {
    pushIssue(
      issues,
      'discountValue',
      'discountValue must be a non-negative number',
    );
  }

  if (input.discountType === 'percentage' && input.discountValue > 1) {
    pushIssue(
      issues,
      'discountValue',
      'percentage discountValue must be between 0 and 1',
    );
  }

  if (!isValidDate(input.startsAt)) {
    pushIssue(issues, 'startsAt', 'startsAt must be a valid date');
  }

  if (input.endsAt !== undefined && !isValidDate(input.endsAt)) {
    pushIssue(issues, 'endsAt', 'endsAt must be a valid date');
  }

  if (
    isValidDate(input.startsAt) &&
    input.endsAt !== undefined &&
    isValidDate(input.endsAt) &&
    input.endsAt < input.startsAt
  ) {
    pushIssue(
      issues,
      'endsAt',
      'endsAt must be greater than or equal to startsAt',
    );
  }

  if (!isPositiveInteger(input.maxUsageTotal)) {
    pushIssue(issues, 'maxUsageTotal', 'maxUsageTotal must be at least 1');
  }

  if (!isPositiveInteger(input.maxUsagePerOrder)) {
    pushIssue(
      issues,
      'maxUsagePerOrder',
      'maxUsagePerOrder must be at least 1',
    );
  }

  if (!isPromotionTemplateKind(kind)) {
    pushIssue(
      issues,
      'kind',
      'kind must be a supported promotion template kind',
    );

    return {
      isValid: false,
      issues,
    };
  }

  switch (kind) {
    case 'product_discount':
      if (!hasRequiredNonBlankIds(input.productIds)) {
        pushIssue(
          issues,
          'productIds',
          'productIds must contain at least one non-blank id and no blank ids',
        );
      }

      if (hasOwnField(input, 'excludedProductIds')) {
        pushIssue(
          issues,
          'excludedProductIds',
          'product_discount does not support excludedProductIds',
        );
      }

      if (hasOwnField(input, 'minimumSubtotal')) {
        pushIssue(
          issues,
          'minimumSubtotal',
          'product_discount does not support minimumSubtotal',
        );
      }
      break;

    case 'category_item_discount':
      if (!hasRequiredNonBlankIds(input.categoryIds)) {
        pushIssue(
          issues,
          'categoryIds',
          'categoryIds must contain at least one non-blank id and no blank ids',
        );
      }

      if (!hasOnlyNonBlankIds(input.excludedProductIds)) {
        pushIssue(
          issues,
          'excludedProductIds',
          'excludedProductIds must contain no blank ids',
        );
      }

      if (hasOwnField(input, 'minimumSubtotal')) {
        pushIssue(
          issues,
          'minimumSubtotal',
          'category_item_discount does not support minimumSubtotal',
        );
      }
      break;

    case 'order_threshold_discount':
      if (
        !Number.isFinite(input.minimumSubtotal) ||
        input.minimumSubtotal < 0
      ) {
        pushIssue(
          issues,
          'minimumSubtotal',
          'minimumSubtotal must be a non-negative number',
        );
      }

      if (hasOwnField(input, 'categoryIds')) {
        pushIssue(
          issues,
          'categoryIds',
          'order_threshold_discount does not support categoryIds',
        );
      }

      if (hasOwnField(input, 'productIds')) {
        pushIssue(
          issues,
          'productIds',
          'order_threshold_discount does not support productIds',
        );
      }

      if (!hasOnlyNonBlankIds(input.excludedProductIds)) {
        pushIssue(
          issues,
          'excludedProductIds',
          'excludedProductIds must contain no blank ids',
        );
      }
      break;

    case 'category_threshold_discount':
      if (!hasRequiredNonBlankIds(input.categoryIds)) {
        pushIssue(
          issues,
          'categoryIds',
          'categoryIds must contain at least one non-blank id and no blank ids',
        );
      }

      if (!hasOnlyNonBlankIds(input.excludedProductIds)) {
        pushIssue(
          issues,
          'excludedProductIds',
          'excludedProductIds must contain no blank ids',
        );
      }

      if (
        !Number.isFinite(input.minimumSubtotal) ||
        input.minimumSubtotal < 0
      ) {
        pushIssue(
          issues,
          'minimumSubtotal',
          'minimumSubtotal must be a non-negative number',
        );
      }
      break;
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

function getPromotionTarget(input: PromotionTemplateInput): PromotionTarget {
  switch (input.kind) {
    case 'product_discount':
      return {
        scope: 'product',
        productIds: normalizeIds(input.productIds),
      };

    case 'category_item_discount':
    case 'category_threshold_discount':
      if (input.excludedProductIds === undefined) {
        return {
          scope: 'category',
          categoryIds: normalizeIds(input.categoryIds),
        };
      }

      return {
        scope: 'category',
        categoryIds: normalizeIds(input.categoryIds),
        excludedProductIds: normalizeIds(input.excludedProductIds),
      };

    case 'order_threshold_discount':
      if (input.excludedProductIds === undefined) {
        return {
          scope: 'order',
        };
      }

      return {
        scope: 'order',
        excludedProductIds: normalizeIds(input.excludedProductIds),
      };
  }
}

export function createPromotionDataFromTemplateInput({
  id,
  organizationId,
  storeId,
  input,
}: CreatePromotionDataFromTemplateInput): PromotionCreateData {
  const validation = validatePromotionTemplateInput(input);

  if (!validation.isValid) {
    throw new Error('Cannot create promotion data from invalid template input');
  }

  const definition = getPromotionTemplateDefinition(input.kind);
  const promotionData: PromotionCreateData = {
    id,
    organizationId,
    storeId,
    name: input.name,
    status: 'draft',
    discountType: input.discountType,
    discountValue: input.discountValue,
    applicationBasis: definition.applicationBasis,
    startsAt: input.startsAt,
    target: getPromotionTarget(input),
    maxUsagePerOrder: input.maxUsagePerOrder ?? 1,
    isExclusive: input.isExclusive ?? false,
  };

  if (input.description !== undefined) {
    promotionData.description = input.description;
  }

  if (input.endsAt !== undefined) {
    promotionData.endsAt = input.endsAt;
  }

  if (input.maxUsageTotal !== undefined) {
    promotionData.maxUsageTotal = input.maxUsageTotal;
  }

  if (
    input.kind === 'order_threshold_discount' ||
    input.kind === 'category_threshold_discount'
  ) {
    promotionData.minimumSubtotal = input.minimumSubtotal;
  }

  return promotionData;
}
