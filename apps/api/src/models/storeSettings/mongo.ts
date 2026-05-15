import { supportedLocales } from '@src/models/common/model';
import {
  hasLocalizedValueForDefaultLocale,
  localizedStringSchema,
} from '@src/models/common/mongo';
import { applySoftDeletePlugin } from '@src/models/plugins/softDelete';
import { storeSettingsCheckoutModes } from '@src/models/storeSettings/model';
import { model, models, Schema } from 'mongoose';

import type { LocalizedString } from '@src/models/common/model';
import type { StoreSettingsEntity } from '@src/models/storeSettings/model';
import type { Model } from 'mongoose';

const businessHourSchema = new Schema(
  {
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },
    isOpen: {
      type: Boolean,
      required: true,
      default: true,
    },
    openTime: {
      type: String,
      trim: true,
    },
    closeTime: {
      type: String,
      trim: true,
    },
  },
  { _id: false },
);

const storeSettingsSchema = new Schema<StoreSettingsEntity>(
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
    displayName: {
      type: localizedStringSchema,
      required: true,
      validate: {
        validator(
          this: StoreSettingsEntity,
          value: LocalizedString | null | undefined,
        ) {
          return hasLocalizedValueForDefaultLocale(value, this.defaultLocale);
        },
        message: 'displayName must have a value for defaultLocale',
      },
    },
    description: {
      type: localizedStringSchema,
    },
    defaultLocale: {
      type: String,
      required: true,
      enum: supportedLocales,
      default: 'en',
    },
    supportedLocales: {
      type: [String],
      required: true,
      enum: supportedLocales,
      default: ['en'],
      validate: {
        validator(this: StoreSettingsEntity, value: string[]) {
          return value.includes(this.defaultLocale);
        },
        message: 'supportedLocales must include defaultLocale',
      },
    },
    businessHours: {
      type: [businessHourSchema],
      default: [],
    },
    serviceFeeRate: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 0,
    },
    checkoutMode: {
      type: String,
      required: true,
      enum: storeSettingsCheckoutModes,
      default: 'pay_first',
    },
  },
  {
    collection: 'storeSettings',
    id: false,
    timestamps: true,
  },
);

applySoftDeletePlugin(storeSettingsSchema);

storeSettingsSchema.index({ organizationId: 1 }, { unique: true });

export const StoreSettingsMongoModel =
  (models.StoreSettings as Model<StoreSettingsEntity> | undefined) ??
  model<StoreSettingsEntity>('StoreSettings', storeSettingsSchema);
