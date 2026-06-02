import type { AppTranslator } from '@/app/i18n';
import type { LocalizedStringDto, SupportedLocale } from './types';

export const supportedMetadataLocales: SupportedLocale[] = ['zh-TW', 'en'];

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
