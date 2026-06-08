import { tDefault } from '@/app/i18n';
import { getSupportedCustomerLocaleLabel } from '@/models/metadata';
import type { SupportedLocale } from '@/models/metadata';
import type { StoreFormFieldErrors } from './useStoreForm';

export function mapStoreValidationIssuesToFieldErrors(
  issues: Array<{ path: PropertyKey[] }>,
  defaultLocale: SupportedLocale,
): StoreFormFieldErrors {
  const fieldErrors: StoreFormFieldErrors = {};

  for (const issue of issues) {
    const [section, field] = issue.path;
    if (section === 'profile' && field === 'displayName') {
      const localeLabel = getSupportedCustomerLocaleLabel(
        defaultLocale,
        tDefault,
      );
      fieldErrors.displayName ??= tDefault(
        'admin.store.errors.displayName',
        'Display name ({{locale}}) is required.',
        { locale: localeLabel },
      );
    } else if (section === 'locale' && field === 'supportedLocales') {
      fieldErrors.supportedLocales ??= tDefault(
        'admin.store.errors.supportedLocales',
        'At least one locale is required.',
      );
    } else if (section === 'locale' && field === 'defaultLocale') {
      fieldErrors.defaultLocale ??= tDefault(
        'admin.store.errors.defaultLocale',
        'Select a default locale.',
      );
    } else if (section === 'operation' && field === 'serviceFeeRate') {
      fieldErrors.serviceFeeRate ??= tDefault(
        'admin.store.errors.serviceFeeRate',
        'Service fee rate must be between 0 and 1.',
      );
    } else if (section === 'operation' && field === 'businessHours') {
      fieldErrors.businessHours ??= tDefault(
        'admin.store.errors.businessHours',
        'Check business hours for invalid time values.',
      );
    }
  }

  return fieldErrors;
}
