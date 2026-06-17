import { useCallback } from 'react';
import { useAppTranslation } from '@/app/i18n';
import { getLocalizedText, languageToLocale } from '@/models/metadata';
import type { LocalizedStringDto } from '@/models/metadata';

/** Resolves localized menu/store text against the active UI language. */
export function useLocalizedText() {
  const { language } = useAppTranslation();
  const locale = languageToLocale(language);

  return useCallback(
    (value: LocalizedStringDto | undefined) =>
      value ? getLocalizedText(value, locale) : '',
    [locale],
  );
}
