import {
  hasAnyLocalizedValue,
  hasLocalizedValueForLocale,
  supportedLocales,
} from '@src/models/common/model';
import { Schema } from 'mongoose';

import type {
  AvailabilityRule,
  LocalizedString,
  SupportedLocale,
  TimeWindow,
} from '@src/models/common/model';

const localizedStringSchemaDefinition = Object.fromEntries(
  supportedLocales.map((locale) => [locale, { type: String, trim: true }]),
);

export const localizedStringSchema = new Schema<LocalizedString>(
  localizedStringSchemaDefinition,
  { _id: false },
);

export function hasAtLeastOneLocalizedValue(
  value: LocalizedString | null | undefined,
): boolean {
  return hasAnyLocalizedValue(value);
}

export function hasLocalizedValueForDefaultLocale(
  value: LocalizedString | null | undefined,
  defaultLocale: SupportedLocale | null | undefined,
): boolean {
  return hasLocalizedValueForLocale(value, defaultLocale);
}

export const timeWindowSchema = new Schema<TimeWindow>(
  {
    start: {
      type: String,
      required: true,
      trim: true,
    },
    end: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

export const availabilityRuleSchema = new Schema<AvailabilityRule>(
  {
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    daysOfWeek: {
      type: [Number],
      validate: {
        validator(value: number[] | null | undefined) {
          return (
            !value ||
            value.every((dayOfWeek) => dayOfWeek >= 0 && dayOfWeek <= 6)
          );
        },
        message: 'daysOfWeek must contain numbers between 0 and 6',
      },
    },
    timeWindows: {
      type: [timeWindowSchema],
      default: [],
    },
  },
  { _id: false },
);
