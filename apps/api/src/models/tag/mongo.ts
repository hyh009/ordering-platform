import {
  hasAtLeastOneLocalizedValue,
  localizedStringSchema,
} from '@src/models/common/localizedString.mongo';
import { mongoValidationMessages } from '@src/models/common/validationMessages';
import { applySoftDeletePlugin } from '@src/models/plugins/softDelete';
import { model, models, Schema } from 'mongoose';

import type { LocalizedString } from '@src/models/common/model';
import type { TagEntity } from '@src/models/tag/model';
import type { Model } from 'mongoose';

const tagSchema = new Schema<TagEntity>(
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
    color: {
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
  },
  {
    collection: 'tags',
    id: false,
    timestamps: true,
  },
);

applySoftDeletePlugin(tagSchema);

export const TagMongoModel =
  (models.Tag as Model<TagEntity> | undefined) ??
  model<TagEntity>('Tag', tagSchema);
