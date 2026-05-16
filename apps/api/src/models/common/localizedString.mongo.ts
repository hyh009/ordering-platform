import {
  hasAnyLocalizedValue,
  hasLocalizedValueForLocale,
  supportedLocales,
} from '@src/models/common/model';
import { Schema } from 'mongoose';

import type {
  LocalizedString,
  SupportedLocale,
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
