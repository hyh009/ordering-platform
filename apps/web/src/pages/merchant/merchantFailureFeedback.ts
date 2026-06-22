import {
  presentFeedback,
  type FailurePresentation,
} from '@/app/global/feedback/presentFeedback';
import {
  applyFormFailure,
  hasFieldErrors,
  type FormErrorSink,
} from '@/shared/components/form/formFailure';

import type {
  MerchantCommandFailure,
  MerchantCommandFailureReason,
} from '@/services/utils/merchantApiError';

// Single source of truth for "what does each merchant failure reason do".
// The exhaustive Record means a new reason cannot be added without declaring
// its presentation.
//
// Merchant pages are form-heavy, so failures show inline on the form that
// triggered them: field errors land on the fields, and every other reason
// becomes the form's submit message. On a page with no form, `inline` falls
// back to a toast.
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

// One entry point for every merchant failure, form or not. Field errors (or an
// `inline` reason) go on the form; everything else is global feedback. Pages
// that need a reason-specific reaction (navigate, refresh) handle that reason
// before calling this.
export function handleMerchantFailure<
  E extends object = Record<string, string>,
>(
  failure: MerchantCommandFailure & { fieldErrors?: E },
  deps: { form?: FormErrorSink<E> } = {},
): void {
  const { form } = deps;
  const kind = MERCHANT_FAILURE_PRESENTATION[failure.reason];

  if (form && (hasFieldErrors(failure.fieldErrors) || kind === 'inline')) {
    applyFormFailure(form, failure);
    return;
  }

  presentFeedback(kind, failure.message);
}
