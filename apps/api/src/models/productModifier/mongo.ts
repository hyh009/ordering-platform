import { availabilityRuleSchema } from '@src/models/common/availability.mongo';
import {
  hasAtLeastOneLocalizedValue,
  localizedStringSchema,
} from '@src/models/common/localizedString.mongo';
import { mongoValidationMessages } from '@src/models/common/validationMessages';
import { applySoftDeletePlugin } from '@src/models/plugins/softDelete';
import {
  productModifierSelectionTypes,
  type ProductModifierEntity,
  type ProductModifierOption,
} from '@src/models/productModifier/model';
import { model, models, Schema } from 'mongoose';

import type { LocalizedString } from '@src/models/common/model';
import type { Model } from 'mongoose';

const modifierOptionSchema = new Schema<ProductModifierOption>(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    sharedOptionCode: {
      type: String,
      trim: true,
    },
    name: {
      type: localizedStringSchema,
      required: true,
      // Cross-document default-locale validation belongs in the service layer,
      // because the default locale lives in Store.
      validate: {
        validator(value: LocalizedString | null | undefined) {
          return hasAtLeastOneLocalizedValue(value);
        },
        message:
          mongoValidationMessages.localizedStringRequired('options.name'),
      },
    },
    priceAdjustment: {
      type: Number,
      required: true,
      default: 0,
    },
    isDefault: {
      type: Boolean,
      required: true,
      default: false,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    isSoldOut: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  { _id: false },
);

const productModifierSchema = new Schema<ProductModifierEntity>(
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
    storeId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: localizedStringSchema,
      required: true,
      // Cross-document default-locale validation belongs in the service layer,
      // because the default locale lives in Store.
      validate: {
        validator(value: LocalizedString | null | undefined) {
          return hasAtLeastOneLocalizedValue(value);
        },
        message: mongoValidationMessages.localizedStringRequired('name'),
      },
    },
    selectionType: {
      type: String,
      required: true,
      enum: productModifierSelectionTypes,
      default: 'single_choice',
    },
    minSelect: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    maxSelect: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    options: {
      type: [modifierOptionSchema],
      required: true,
      validate: [
        {
          validator(value: ProductModifierOption[] | null | undefined) {
            return Array.isArray(value) && value.length > 0;
          },
          message: 'options must contain at least one option',
        },
      ],
    },
    inheritCategoryAvailability: {
      type: Boolean,
      required: true,
      default: true,
    },
    availabilityRules: {
      type: [availabilityRuleSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    collection: 'productModifiers',
    id: false,
    timestamps: true,
  },
);

productModifierSchema.path('maxSelect').validate(function validateMaxSelect(
  this: { getUpdate?: unknown; minSelect?: number },
  value: number,
) {
  if (typeof this.getUpdate === 'function') {
    return true;
  }

  return value >= (this.minSelect ?? 0);
}, 'maxSelect must be greater than or equal to minSelect');

productModifierSchema
  .path('selectionType')
  .validate(function validateSingleChoice(
    this: { getUpdate?: unknown; maxSelect?: number },
    value: string,
  ) {
    if (typeof this.getUpdate === 'function') {
      return true;
    }

    return value !== 'single_choice' || this.maxSelect === 1;
  }, 'single_choice modifiers must have maxSelect equal to 1');

applySoftDeletePlugin(productModifierSchema);
productModifierSchema.index({ id: 1 }, { unique: true });

export const ProductModifierMongoModel =
  (models.ProductModifier as Model<ProductModifierEntity> | undefined) ??
  model<ProductModifierEntity>('ProductModifier', productModifierSchema);
