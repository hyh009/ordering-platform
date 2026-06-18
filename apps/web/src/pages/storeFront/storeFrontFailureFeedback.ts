import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { tDefault } from '@/app/i18n';

import type {
  StoreFrontCommandFailure,
  StoreFrontCommandFailureReason,
} from '@/services/utils/storeFrontApiError';

// How a storefront failure is surfaced to the guest.
// - toast:  transient error, page stays usable
// - modal:  guest must acknowledge before continuing
// - inline: shown on the form that triggered it (form-level submit error)
// - silent: control-flow signal with no user-facing message
type FailurePresentation = 'toast' | 'modal' | 'inline' | 'silent';

// Single source of truth for "what does each storefront failure reason do".
// Reading this table answers the behavior at a glance, and the exhaustive
// Record means a new reason cannot be added without declaring its presentation.
export const STOREFRONT_FAILURE_PRESENTATION: Record<
  StoreFrontCommandFailureReason,
  FailurePresentation
> = {
  // Benign race: the active store changed while a request was in flight. The
  // page is already handing off, so there is nothing to show.
  'session-store-mismatch': 'silent',
  // Belongs next to the form that submitted the code, not a transient toast.
  'invalid-join-code': 'inline',
  'session-expired': 'toast',
  'store-closed': 'toast',
  'order-locked': 'toast',
  'sold-out': 'toast',
  'cart-not-active': 'toast',
  invalid: 'toast',
  'not-found': 'toast',
  network: 'toast',
  server: 'toast',
  unknown: 'toast',
};

// A form's error slots. Pages that own a form pass this so inline and field
// errors can land on the form instead of a toast.
export type FormErrorSink = {
  setSubmitError: (message: string | null) => void;
  setFieldErrors?: (errors: Record<string, string>) => void;
};

type Failure = StoreFrontCommandFailure & {
  fieldErrors?: Record<string, string>;
};

function hasFieldErrors(errors?: Record<string, string>): errors is Record<string, string> {
  return !!errors && Object.keys(errors).length > 0;
}

// One entry point for every storefront failure, form or not. Field errors win
// and go on the fields; otherwise the reason's presentation decides between
// inline (form), modal, toast, or silent. Pages that need a reason-specific
// reaction (navigate, clear session) handle that reason before calling this.
export function handleStoreFrontFailure(
  failure: Failure,
  deps: { form?: FormErrorSink } = {},
): void {
  const { form } = deps;

  // Field-level validation always takes precedence and suppresses the
  // form-level message; see docs/agent/frontend/forms.md.
  if (form?.setFieldErrors && hasFieldErrors(failure.fieldErrors)) {
    form.setFieldErrors(failure.fieldErrors);
    form.setSubmitError(null);
    return;
  }

  const presentation = STOREFRONT_FAILURE_PRESENTATION[failure.reason];

  // Silent reasons, and any failure without a user-facing message (command
  // guards build control signals with an empty message), show nothing.
  if (presentation === 'silent' || !failure.message) {
    form?.setSubmitError(null);
    return;
  }

  // Inline needs a form to land in. With one, show it as the form submit error;
  // without one, fall through to a toast so the message is never dropped.
  if (presentation === 'inline' && form) {
    form.setSubmitError(failure.message);
    return;
  }

  // Non-inline presentation: clear any stale inline error first.
  form?.setSubmitError(null);

  if (presentation === 'modal') {
    void feedbackCommands.alert({
      title: tDefault('guest.errors.title', 'Something went wrong'),
      message: failure.message,
    });
    return;
  }

  feedbackCommands.toast({ tone: 'error', message: failure.message });
}
