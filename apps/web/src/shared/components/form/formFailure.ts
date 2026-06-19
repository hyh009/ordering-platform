// A form's error slots. A page passes this so field-level and form-level
// (submit) errors land on the form rather than as a toast.
export type FormErrorSink = {
  setSubmitError: (message: string | null) => void;
  setFieldErrors?: (errors: Record<string, string>) => void;
};

export function hasFieldErrors(
  errors?: Record<string, string>,
): errors is Record<string, string> {
  return !!errors && Object.keys(errors).length > 0;
}

type FormFailure = {
  message: string;
  fieldErrors?: Record<string, string>;
};

// Show a failure on the form it came from: field errors land on the fields and
// suppress the form-level message; otherwise the message becomes the form-level
// submit error. Callers decide WHEN a failure belongs on a form (it carries
// field errors, or the reason's presentation is `inline`).
export function applyFormFailure(form: FormErrorSink, failure: FormFailure): void {
  if (form.setFieldErrors && hasFieldErrors(failure.fieldErrors)) {
    form.setFieldErrors(failure.fieldErrors);
    form.setSubmitError(null);
    return;
  }

  form.setSubmitError(failure.message);
}
