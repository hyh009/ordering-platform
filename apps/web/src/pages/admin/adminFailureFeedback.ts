import {
  presentFailure,
  type FailurePresentation,
  type FormErrorSink,
} from '@/app/global/feedback/presentFailure';

import type {
  AdminCommandFailure,
  AdminCommandFailureReason,
} from '@/services/utils/adminApiError';

// Single source of truth for "what does each admin failure reason do".
// The exhaustive Record means a new reason cannot be added without declaring
// its presentation.
//
// Admin pages are form-heavy, so failures show inline on the form that
// triggered them: field errors land on the fields (handled before the kind),
// and every other reason becomes the form's submit message. On a page with no
// form, `inline` falls back to a toast.
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

// One entry point for every admin failure, form or not. Delegates to the
// shared dispatch with this area's presentation table. Pages that need a
// reason-specific reaction (navigate, refresh) handle that reason before
// calling this.
export function handleAdminFailure(
  failure: AdminCommandFailure & { fieldErrors?: Record<string, string> },
  deps: { form?: FormErrorSink } = {},
): void {
  presentFailure(failure, ADMIN_FAILURE_PRESENTATION, deps);
}
