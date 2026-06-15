import { useCallback } from 'react';
import { useAppTranslation } from '@/app/i18n';
import { getLocalizedText } from '@/models/metadata';
import type { LocalizedStringDto, SupportedLocale } from '@/models/metadata';

function toSupportedLocale(language: string): SupportedLocale {
  return language === 'en' ? 'en' : 'zh-TW';
}

/** Resolves localized menu/store text against the active UI language. */
export function useLocalizedText() {
  const { language } = useAppTranslation();
  const locale = toSupportedLocale(language);

  return useCallback(
    (value: LocalizedStringDto | undefined) =>
      value ? getLocalizedText(value, locale) : '',
    [locale],
  );
}
