export const mongoValidationMessages = {
  localizedStringRequired(fieldName: string) {
    return `${fieldName} must have at least one localized value`;
  },
  defaultLocaleLocalizedStringRequired(fieldName: string) {
    return `${fieldName} must have a value for defaultLocale`;
  },
  supportedLocalesIncludeDefaultLocale:
    'supportedLocales must include defaultLocale',
  daysOfWeekRange: 'daysOfWeek must contain numbers between 0 and 6',
} as const;
