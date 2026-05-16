import {
  hasLocalizedValueForDefaultLocale,
  localizedStringSchema,
} from '@src/models/common/localizedString.mongo';
import { supportedLocales } from '@src/models/common/model';
import { mongoValidationMessages } from '@src/models/common/validationMessages';
import { applySoftDeletePlugin } from '@src/models/plugins/softDelete';
import {
  storeOrderTypes,
  storeSettingsCheckoutModes,
} from '@src/models/storeSettings/model';
import { model, models, Schema } from 'mongoose';

import type { LocalizedString } from '@src/models/common/model';
import type {
  StoreOrderMode,
  StoreSettingsEntity,
} from '@src/models/storeSettings/model';
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

const defaultOrderModes: StoreOrderMode[] = [
  {
    type: 'dine_in',
    isEnabled: true,
    checkoutMode: 'pay_later',
  },
  {
    type: 'takeaway',
    isEnabled: true,
    checkoutMode: 'pay_first',
  },
];

const orderModeSchema = new Schema<StoreOrderMode>(
  {
    type: {
      type: String,
      required: true,
      enum: storeOrderTypes,
    },
    isEnabled: {
      type: Boolean,
      required: true,
      default: true,
    },
    checkoutMode: {
      type: String,
      required: true,
      enum: storeSettingsCheckoutModes,
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
        message:
          mongoValidationMessages.defaultLocaleLocalizedStringRequired(
            'displayName',
          ),
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
        message: mongoValidationMessages.supportedLocalesIncludeDefaultLocale,
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
    orderModes: {
      type: [orderModeSchema],
      required: true,
      default: () => defaultOrderModes.map((mode) => ({ ...mode })),
      validate: [
        {
          validator(value: StoreOrderMode[] | null | undefined) {
            return Array.isArray(value) && value.length > 0;
          },
          message: mongoValidationMessages.orderModesRequired,
        },
        {
          validator(value: StoreOrderMode[] | null | undefined) {
            if (!Array.isArray(value)) {
              return false;
            }

            const types = value.map((mode) => mode.type);

            return new Set(types).size === types.length;
          },
          message: mongoValidationMessages.orderModesUniqueTypes,
        },
        {
          validator(value: StoreOrderMode[] | null | undefined) {
            return Array.isArray(value) && value.some((mode) => mode.isEnabled);
          },
          message: mongoValidationMessages.orderModesEnabledRequired,
        },
      ],
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
