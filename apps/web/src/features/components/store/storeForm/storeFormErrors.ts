import { createStoreSchema } from '@repo/shared';
import type { CreateStoreRequest } from '@repo/shared';
import { tDefault } from '@/app/i18n';
import { getSupportedCustomerLocaleLabel } from '@/models/metadata';
import { toCreateStoreRequest } from './storeFormMapper';
import type { StoreFormFieldErrors, StoreFormValues } from './useStoreForm';

type ValidateStoreFormResult =
  | { success: true; data: CreateStoreRequest }
  | { success: false; fieldErrors: StoreFormFieldErrors; submitError: string };

export function validateStoreForm(values: StoreFormValues): ValidateStoreFormResult {
  const request = toCreateStoreRequest(values);
  const result = createStoreSchema.safeParse(request);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const fieldErrors: StoreFormFieldErrors = {};

  for (const issue of result.error.issues) {
    const [section, field] = issue.path;
    if (section === 'profile' && field === 'displayName') {
      const localeLabel = getSupportedCustomerLocaleLabel(values.defaultLocale, tDefault);
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

  return {
    success: false,
    fieldErrors,
    submitError: tDefault(
      'admin.errors.validation',
      'Check the highlighted fields and try again.',
    ),
  };
}
