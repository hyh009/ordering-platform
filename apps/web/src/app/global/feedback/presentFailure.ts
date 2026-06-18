import { tDefault } from '@/app/i18n';
import { feedbackCommands } from './feedback.commands';

// How a command failure is surfaced to the user.
// - toast:  transient error, page stays usable
// - modal:  user must acknowledge before continuing
// - inline: shown on the form that triggered it (form-level submit error)
// - silent: control-flow signal with no user-facing message
export type FailurePresentation = 'toast' | 'modal' | 'inline' | 'silent';

// A form's error slots. Pages that own a form pass this so inline and field
// errors land on the form instead of a toast.
export type FormErrorSink = {
  setSubmitError: (message: string | null) => void;
  setFieldErrors?: (errors: Record<string, string>) => void;
};

type Failure<R extends string> = {
  status: 'failed';
  reason: R;
  message: string;
  fieldErrors?: Record<string, string>;
};

function hasFieldErrors(
  errors?: Record<string, string>,
): errors is Record<string, string> {
  return !!errors && Object.keys(errors).length > 0;
}

// Single dispatch for every area's command failure. The area supplies its own
// exhaustive `reason -> presentation` table; the resolution order is identical
// everywhere: field errors -> inline (form) -> modal -> toast -> silent. inline
// without a form falls back to toast so the message is never dropped.
export function presentFailure<R extends string>(
  failure: Failure<R>,
  presentation: Record<R, FailurePresentation>,
  deps: { form?: FormErrorSink } = {},
): void {
  const { form } = deps;

  // Field-level validation always wins and suppresses the form-level message;
  // see docs/agent/frontend/forms.md.
  if (form?.setFieldErrors && hasFieldErrors(failure.fieldErrors)) {
    form.setFieldErrors(failure.fieldErrors);
    form.setSubmitError(null);
    return;
  }

  const kind = presentation[failure.reason];

  // Silent reasons, and any failure without a user-facing message (command
  // guards build control signals with an empty message), show nothing.
  if (kind === 'silent' || !failure.message) {
    form?.setSubmitError(null);
    return;
  }

  // Inline needs a form to land in; without one, fall through to a toast.
  if (kind === 'inline' && form) {
    form.setSubmitError(failure.message);
    return;
  }

  // Non-inline presentation: clear any stale inline error first.
  form?.setSubmitError(null);

  if (kind === 'modal') {
    void feedbackCommands.alert({
      title: tDefault('common.errors.title', 'Something went wrong'),
      message: failure.message,
    });
    return;
  }

  feedbackCommands.toast({ tone: 'error', message: failure.message });
}
