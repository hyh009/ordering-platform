import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getLocalizedText, languageToLocale } from '@/models/metadata';
import type { LocalizedStringDto } from '@/models/metadata';

/** Resolves localized menu/store text against the active UI language.
 *  Uses i18n.language (the user's requested language) rather than
 *  resolvedLanguage, which falls back to zh-TW when no en resource bundle is
 *  loaded and would cause DB-backed content to ignore the user's selection.
 */
export function useLocalizedText() {
  const { i18n } = useTranslation();
  const locale = languageToLocale(i18n.language);

  return useCallback(
    (value: LocalizedStringDto | undefined) =>
      value ? getLocalizedText(value, locale) : '',
    [locale],
  );
}
