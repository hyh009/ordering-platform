import {
  hasAtLeastOneLocalizedValue,
  localizedStringSchema,
} from '@src/models/common/localizedString.mongo';
import { mongoValidationMessages } from '@src/models/common/validationMessages';
import { model, models, Schema } from 'mongoose';

import type { AllergenEntity } from '@src/models/allergen/model';
import type { LocalizedString } from '@src/models/common/model';
import type { Model } from 'mongoose';

const allergenSchema = new Schema<AllergenEntity>(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: localizedStringSchema,
      required: true,
      validate: {
        validator(value: LocalizedString | null | undefined) {
          return hasAtLeastOneLocalizedValue(value);
        },
        message: mongoValidationMessages.localizedStringRequired('name'),
      },
    },
    icon: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    collection: 'allergens',
    id: false,
    timestamps: true,
  },
);

allergenSchema.index({ id: 1 }, { unique: true });
allergenSchema.index({ key: 1 }, { unique: true });

export const AllergenMongoModel =
  (models.Allergen as Model<AllergenEntity> | undefined) ??
  model<AllergenEntity>('Allergen', allergenSchema);
