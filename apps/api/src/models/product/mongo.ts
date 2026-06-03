import {
  hasAtLeastOneLocalizedValue,
  localizedStringSchema,
} from '@src/models/common/localizedString.mongo';
import { mongoValidationMessages } from '@src/models/common/validationMessages';
import { applySoftDeletePlugin } from '@src/models/plugins/softDelete';
import { model, models, Schema } from 'mongoose';

import type { LocalizedString } from '@src/models/common/model';
import type { ProductEntity } from '@src/models/product/model';
import type { Model } from 'mongoose';

const referencedIdSchema = {
  type: String,
  trim: true,
};

const productSchema = new Schema<ProductEntity>(
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
    categoryIds: {
      type: [referencedIdSchema],
      default: [],
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
    description: {
      type: localizedStringSchema,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    tagIds: {
      type: [referencedIdSchema],
      default: [],
    },
    allergenIds: {
      type: [referencedIdSchema],
      default: [],
    },
    dietaryMarkerIds: {
      type: [referencedIdSchema],
      default: [],
    },
    modifierIds: {
      type: [referencedIdSchema],
      default: [],
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
  {
    collection: 'products',
    id: false,
    timestamps: true,
  },
);

applySoftDeletePlugin(productSchema);
productSchema.index({ id: 1 }, { unique: true });

export const ProductMongoModel =
  (models.Product as Model<ProductEntity> | undefined) ??
  model<ProductEntity>('Product', productSchema);
