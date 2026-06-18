import {
  presentFailure,
  type FailurePresentation,
  type FormErrorSink,
} from '@/app/global/feedback/presentFailure';

import type {
  MerchantCommandFailure,
  MerchantCommandFailureReason,
} from '@/services/utils/merchantApiError';

// Single source of truth for "what does each merchant failure reason do".
// The exhaustive Record means a new reason cannot be added without declaring
// its presentation.
//
// Merchant pages are form-heavy, so failures show inline on the form that
// triggered them: field errors land on the fields (handled before the kind),
// and every other reason becomes the form's submit message. On a page with no
// form, `inline` falls back to a toast.
export const MERCHANT_FAILURE_PRESENTATION: Record<
  MerchantCommandFailureReason,
  FailurePresentation
> = {
  invalid: 'inline',
  conflict: 'inline',
  forbidden: 'inline',
  'not-found': 'inline',
  network: 'inline',
  server: 'inline',
  unknown: 'inline',
};

// One entry point for every merchant failure, form or not. Delegates to the
// shared dispatch with this area's presentation table. Pages that need a
// reason-specific reaction (navigate, refresh) handle that reason before
// calling this.
export function handleMerchantFailure(
  failure: MerchantCommandFailure & { fieldErrors?: Record<string, string> },
  deps: { form?: FormErrorSink } = {},
): void {
  presentFailure(failure, MERCHANT_FAILURE_PRESENTATION, deps);
}
