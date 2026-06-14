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
  BusinessHour,
  StoreEntity,
  StoreLocale,
  StoreOrderMode,
} from '@src/models/store/model';
import type { Model } from 'mongoose';

// 00:00–23:59 only; mirrors the shared zod request schema's time regex.
const timeOfDayRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

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
      match: [timeOfDayRegex, mongoValidationMessages.businessHoursTimeFormat],
    },
    closeTime: {
      type: String,
      trim: true,
      match: [timeOfDayRegex, mongoValidationMessages.businessHoursTimeFormat],
      validate: {
        // Equal open/close is only valid as the 00:00 all-day (24-hour) marker.
        validator(this: BusinessHour, value: string | undefined) {
          if (!this.isOpen || !this.openTime || !value) return true;
          return this.openTime !== value || value === '00:00';
        },
        message: mongoValidationMessages.businessHoursOpenCloseEqual,
      },
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
      validate: {
        validator(value: BusinessHour[] | null | undefined) {
          if (!Array.isArray(value)) return false;
          const days = value.map((hour) => hour.dayOfWeek);
          return new Set(days).size === days.length;
        },
        message: mongoValidationMessages.businessHoursUniqueDays,
      },
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
    // store.update is read-modify-write (findOne + save) because subdocument
    // cross-field validators only run on the full document. Version the doc so a
    // stale concurrent save throws VersionError instead of clobbering. See
    // docs/features/concurrency-control.md.
    optimisticConcurrency: true,
  },
);

applySoftDeletePlugin(storeSchema);

storeSchema.index({ id: 1 }, { unique: true });
storeSchema.index({ organizationId: 1 });

export const StoreMongoModel =
  (models.Store as Model<StoreEntity> | undefined) ??
  model<StoreEntity>('Store', storeSchema);
