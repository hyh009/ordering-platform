import {
  hasAtLeastOneLocalizedValue,
  localizedStringSchema,
} from '@src/models/common/localizedString.mongo';
import { mongoValidationMessages } from '@src/models/common/validationMessages';
import { applySoftDeletePlugin } from '@src/models/plugins/softDelete';
import {
  promotionApplicationBases,
  promotionDiscountTypes,
  promotionStatuses,
  promotionTargetScopes,
} from '@src/models/promotion/model';
import { model, models, Schema } from 'mongoose';

import type { LocalizedString } from '@src/models/common/model';
import type {
  PromotionEntity,
  PromotionTargetScope,
} from '@src/models/promotion/model';
import type { Model } from 'mongoose';

type PromotionTargetDocument = {
  scope: PromotionTargetScope;
  categoryIds?: string[];
  productIds?: string[];
  excludedProductIds?: string[];
};

const referencedIdSchema = {
  type: String,
  trim: true,
};

function getTargetIds(
  target: PromotionTargetDocument,
  field: 'categoryIds' | 'productIds' | 'excludedProductIds',
) {
  return target[field];
}

const promotionTargetSchema = new Schema<PromotionTargetDocument>(
  {
    scope: {
      type: String,
      required: true,
      enum: promotionTargetScopes,
      validate: {
        validator(this: PromotionTargetDocument, value: PromotionTargetScope) {
          const categoryIds = getTargetIds(this, 'categoryIds');
          const productIds = getTargetIds(this, 'productIds');
          const excludedProductIds = getTargetIds(this, 'excludedProductIds');

          if (value === 'order') {
            return !categoryIds?.length && !productIds?.length;
          }

          if (value === 'category') {
            return Boolean(categoryIds?.length) && !productIds?.length;
          }

          return (
            Boolean(productIds?.length) &&
            !categoryIds?.length &&
            !excludedProductIds?.length
          );
        },
        message:
          'promotion target ids must match scope: order uses no target ids, category uses categoryIds, product uses only productIds',
      },
    },
    categoryIds: {
      type: [referencedIdSchema],
      default: undefined,
    },
    productIds: {
      type: [referencedIdSchema],
      default: undefined,
    },
    excludedProductIds: {
      type: [referencedIdSchema],
      default: undefined,
    },
  },
  { _id: false },
);

const promotionSchema = new Schema<PromotionEntity>(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    organizationId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: localizedStringSchema,
      required: true,
      // Cross-document default-locale validation belongs in the service layer,
      // because the default locale lives in StoreSettings.
      validate: {
        validator(value: LocalizedString | null | undefined) {
          return hasAtLeastOneLocalizedValue(value);
        },
        message: mongoValidationMessages.localizedStringRequired('name'),
      },
    },
    description: {
      type: localizedStringSchema,
    },
    status: {
      type: String,
      required: true,
      enum: promotionStatuses,
      default: 'draft',
    },
    discountType: {
      type: String,
      required: true,
      enum: promotionDiscountTypes,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator(this: PromotionEntity, value: number) {
          return this.discountType !== 'percentage' || value <= 1;
        },
        message: 'percentage promotion discountValue must be between 0 and 1',
      },
    },
    applicationBasis: {
      type: String,
      required: true,
      enum: promotionApplicationBases,
      validate: {
        validator(
          this: PromotionEntity,
          value: PromotionEntity['applicationBasis'],
        ) {
          if (!this.target) {
            return true;
          }

          if (this.target.scope === 'order') {
            return value === 'subtotal';
          }

          return this.minimumSubtotal === undefined || value === 'subtotal';
        },
        message:
          'promotion applicationBasis must be subtotal for order or minimum-subtotal discounts',
      },
    },
    minimumSubtotal: {
      type: Number,
      min: 0,
    },
    startsAt: {
      type: Date,
      required: true,
    },
    endsAt: {
      type: Date,
      validate: {
        validator(this: PromotionEntity, value: Date | null | undefined) {
          return !value || value >= this.startsAt;
        },
        message: 'endsAt must be greater than or equal to startsAt',
      },
    },
    target: {
      type: promotionTargetSchema,
      required: true,
    },
    maxUsageTotal: {
      type: Number,
      min: 1,
    },
    maxUsagePerOrder: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    isExclusive: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    collection: 'promotions',
    id: false,
    timestamps: true,
  },
);

applySoftDeletePlugin(promotionSchema);

export const PromotionMongoModel =
  (models.Promotion as Model<PromotionEntity> | undefined) ??
  model<PromotionEntity>('Promotion', promotionSchema);
