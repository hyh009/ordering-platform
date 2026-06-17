import type { AppTranslator } from '@/app/i18n';
import type {
  LocalizedStringDto,
  MetadataActiveFilter,
  SupportedLocale,
} from './types';

export const supportedMetadataLocales: SupportedLocale[] = ['zh-TW', 'en'];

// Default authoring language for platform metadata (allergens, dietary
// markers). Super admins enter content in this locale first. Centralized so the
// platform default lives in one place instead of scattered "zh-TW" literals.
export const DEFAULT_METADATA_LOCALE: SupportedLocale = 'zh-TW';

export function getMetadataVisibilityOptions(
  tDefault: AppTranslator,
): { label: string; value: MetadataActiveFilter }[] {
  return [
    { label: tDefault('admin.metadata.activeOnly', 'Active'), value: 'true' },
    {
      label: tDefault('admin.metadata.inactiveOnly', 'Inactive'),
      value: 'false',
    },
    { label: tDefault('admin.metadata.all', 'All'), value: 'all' },
  ];
}

export function getSupportedCustomerLocaleLabel(
  locale: SupportedLocale,
  tDefault: AppTranslator,
) {
  switch (locale) {
    case 'zh-TW':
      return tDefault('metadata.customerLocales.zhTw', '繁體中文');
    case 'en':
      return tDefault('metadata.customerLocales.en', 'English');
  }
}

export function getLocalizedText(
  value: LocalizedStringDto,
  locale: SupportedLocale = 'zh-TW',
) {
  return value[locale] ?? value['zh-TW'] ?? value.en ?? '';
}

/**
 * Narrows a UI language code to a content locale, or `undefined` when it is not
 * a supported locale (callers then fall back to `getLocalizedText`'s default).
 */
export function languageToLocale(language: string): SupportedLocale | undefined {
  return supportedMetadataLocales.includes(language as SupportedLocale)
    ? (language as SupportedLocale)
    : undefined;
}
