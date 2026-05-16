import {
  hasAtLeastOneLocalizedValue,
  localizedStringSchema,
} from '@src/models/common/localizedString.mongo';
import { mongoValidationMessages } from '@src/models/common/validationMessages';
import { dietaryMarkerTypes } from '@src/models/dietaryMarker/model';
import { model, models, Schema } from 'mongoose';

import type { LocalizedString } from '@src/models/common/model';
import type { DietaryMarkerEntity } from '@src/models/dietaryMarker/model';
import type { Model } from 'mongoose';

const dietaryMarkerSchema = new Schema<DietaryMarkerEntity>(
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
    type: {
      type: String,
      required: true,
      enum: dietaryMarkerTypes,
      default: 'dietary',
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    collection: 'dietaryMarkers',
    id: false,
    timestamps: true,
  },
);

export const DietaryMarkerMongoModel =
  (models.DietaryMarker as Model<DietaryMarkerEntity> | undefined) ??
  model<DietaryMarkerEntity>('DietaryMarker', dietaryMarkerSchema);
