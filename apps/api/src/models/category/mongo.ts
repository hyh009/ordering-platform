import { availabilityRuleSchema } from '@src/models/common/availability.mongo';
import {
  hasAtLeastOneLocalizedValue,
  localizedStringSchema,
} from '@src/models/common/localizedString.mongo';
import { mongoValidationMessages } from '@src/models/common/validationMessages';
import { applySoftDeletePlugin } from '@src/models/plugins/softDelete';
import { model, models, Schema } from 'mongoose';

import type { CategoryEntity } from '@src/models/category/model';
import type { LocalizedString } from '@src/models/common/model';
import type { Model } from 'mongoose';

const categorySchema = new Schema<CategoryEntity>(
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
    imageUrl: {
      type: String,
      trim: true,
    },
    displayOrder: {
      type: Number,
      required: true,
      default: 0,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    availabilityRules: {
      type: [availabilityRuleSchema],
      default: [],
    },
  },
  {
    collection: 'categories',
    id: false,
    timestamps: true,
  },
);

applySoftDeletePlugin(categorySchema);

export const CategoryMongoModel =
  (models.Category as Model<CategoryEntity> | undefined) ??
  model<CategoryEntity>('Category', categorySchema);
