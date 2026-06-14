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
  orderModesRequired: 'orderModes must include at least one order mode',
  orderModesUniqueTypes: 'orderModes cannot contain duplicate types',
  orderModesEnabledRequired:
    'orderModes must include at least one enabled order mode',
  businessHoursOpenCloseEqual:
    'openTime and closeTime cannot be equal unless both are 00:00 (24-hour)',
  businessHoursTimeFormat:
    'time must be in HH:MM format between 00:00 and 23:59',
  businessHoursUniqueDays: 'businessHours cannot contain duplicate days',
} as const;
