import { useAppTranslation } from '@/app/i18n';
import {
  getSupportedCustomerLocaleLabel,
  supportedLocales,
} from '@/models/metadata';
import type { LocalizedStringDto, SupportedLocale } from '@/models/metadata';

type LocalizedStringViewProps = {
  value: LocalizedStringDto;
  /** When set, this locale's line is emphasized and listed first. */
  highlightLocale?: SupportedLocale;
};

/**
 * @reusable
 * @description Read-only display of a localized string, one labelled line per
 * filled locale. The plain-text counterpart to LocalizedStringInput.
 * @keywords localized, multilingual, read-only, view, locale
 */
export function LocalizedStringView({
  value,
  highlightLocale,
}: LocalizedStringViewProps) {
  const { tDefault } = useAppTranslation();
  const filled = (supportedLocales as readonly SupportedLocale[]).filter(
    (locale) => value[locale],
  );

  if (filled.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const ordered =
    highlightLocale && filled.includes(highlightLocale)
      ? [
          highlightLocale,
          ...filled.filter((locale) => locale !== highlightLocale),
        ]
      : filled;

  return (
    <span className="grid gap-0.5">
      {ordered.map((locale) => {
        const isHighlight = highlightLocale === locale;
        return (
          <span key={locale} className="flex items-baseline gap-2">
            <span className="shrink-0 text-xs font-medium text-muted-foreground">
              {getSupportedCustomerLocaleLabel(locale, tDefault)}
            </span>
            <span
              className={
                highlightLocale
                  ? isHighlight
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground'
                  : undefined
              }
            >
              {value[locale]}
            </span>
          </span>
        );
      })}
    </span>
  );
}
