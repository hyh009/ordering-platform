export const supportedLocales = ['en', 'zh-TW'] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

export type LocalizedString = Partial<Record<SupportedLocale, string>>;

export type TimeWindow = {
  start: string;
  end: string;
};

/**
 * Menu availability restrictions.
 *
 * An empty availabilityRules array means unrestricted availability for the
 * layer that owns it. For example, a category with no rules is always
 * available. A product with inheritCategoryAvailability=false and no rules is
 * also always available, because it explicitly overrides the category with no
 * restrictions.
 */
export type AvailabilityRule = {
  startDate?: Date;
  endDate?: Date;
  daysOfWeek?: number[];
  timeWindows?: TimeWindow[];
};

export function hasAnyLocalizedValue(
  value: LocalizedString | null | undefined,
): boolean {
  if (!value) {
    return false;
  }

  return supportedLocales.some((locale) => {
    const localeValue = value[locale];

    return typeof localeValue === 'string' && localeValue.trim().length > 0;
  });
}

export function hasLocalizedValueForLocale(
  value: LocalizedString | null | undefined,
  locale: SupportedLocale | null | undefined,
): boolean {
  if (!value || !locale) {
    return false;
  }

  const localeValue = value[locale];

  return typeof localeValue === 'string' && localeValue.trim().length > 0;
}
