import {
  hasAtLeastOneLocalizedValue,
  localizedStringSchema,
} from '@src/models/common/localizedString.mongo';
import { supportedLocales } from '@src/models/common/model';
import { mongoValidationMessages } from '@src/models/common/validationMessages';
import { applySoftDeletePlugin } from '@src/models/plugins/softDelete';
import {
  storeCheckoutModes,
  storeOrderTypes,
  storeStatuses,
} from '@src/models/store/model';
import { model, models, Schema } from 'mongoose';

import type {
  StoreEntity,
  StoreLocale,
  StoreOrderMode,
} from '@src/models/store/model';
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
  { type: 'dine_in', isEnabled: true, checkoutMode: 'pay_later' },
  { type: 'takeaway', isEnabled: true, checkoutMode: 'pay_first' },
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
      enum: storeCheckoutModes,
    },
  },
  { _id: false },
);

const storeProfileSchema = new Schema(
  {
    displayName: {
      type: localizedStringSchema,
      required: true,
      validate: {
        validator(value: unknown) {
          return hasAtLeastOneLocalizedValue(
            value as Parameters<typeof hasAtLeastOneLocalizedValue>[0],
          );
        },
        message: mongoValidationMessages.localizedStringRequired(
          'profile.displayName',
        ),
      },
    },
    description: {
      type: localizedStringSchema,
    },
  },
  { _id: false },
);

const storeLocaleSchema = new Schema<StoreLocale>(
  {
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
        validator(this: StoreLocale, value: string[]) {
          return value.includes(this.defaultLocale);
        },
        message: mongoValidationMessages.supportedLocalesIncludeDefaultLocale,
      },
    },
  },
  { _id: false },
);

const storeOperationSchema = new Schema(
  {
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
            if (!Array.isArray(value)) return false;
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
  { _id: false },
);

const storeSchema = new Schema<StoreEntity>(
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
    profile: {
      type: storeProfileSchema,
      required: true,
    },
    locale: {
      type: storeLocaleSchema,
      required: true,
    },
    operation: {
      type: storeOperationSchema,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: storeStatuses,
      default: 'active',
    },
  },
  {
    collection: 'stores',
    id: false,
    timestamps: true,
  },
);

applySoftDeletePlugin(storeSchema);

storeSchema.index({ id: 1 }, { unique: true });
storeSchema.index({ organizationId: 1 });

export const StoreMongoModel =
  (models.Store as Model<StoreEntity> | undefined) ??
  model<StoreEntity>('Store', storeSchema);
