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
  AdminCommandFailure,
  AdminCommandFailureReason,
} from '@/services/utils/adminApiError';

// Single source of truth for "what does each admin failure reason do".
// The exhaustive Record means a new reason cannot be added without declaring
// its presentation.
//
// Admin pages are form-heavy, so failures show inline on the form that
// triggered them: field errors land on the fields, and every other reason
// becomes the form's submit message. On a page with no form, `inline` falls
// back to a toast.
export const ADMIN_FAILURE_PRESENTATION: Record<
  AdminCommandFailureReason,
  FailurePresentation
> = {
  'already-exists': 'inline',
  'not-found': 'inline',
  invalid: 'inline',
  forbidden: 'inline',
  network: 'inline',
  server: 'inline',
  unknown: 'inline',
  'user-disabled': 'inline',
};

// One entry point for every admin failure, form or not. Field errors (or an
// `inline` reason) go on the form; everything else is global feedback. Pages
// that need a reason-specific reaction (navigate, refresh) handle that reason
// before calling this.
export function handleAdminFailure(
  failure: AdminCommandFailure & { fieldErrors?: Record<string, string> },
  deps: { form?: FormErrorSink } = {},
): void {
  const { form } = deps;
  const kind = ADMIN_FAILURE_PRESENTATION[failure.reason];

  if (form && (hasFieldErrors(failure.fieldErrors) || kind === 'inline')) {
    applyFormFailure(form, failure);
    return;
  }

  presentFeedback(kind, failure.message);
}
