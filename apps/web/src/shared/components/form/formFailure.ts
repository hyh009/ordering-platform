// A form's error slots. A page passes this so field-level and form-level
// (submit) errors land on the form rather than as a toast. `E` is the field
// error map shape; it defaults to a flat `Record<string, string>` but a form
// with a richer shape (e.g. nested per-row errors) can specialize it.
export type FormErrorSink<E extends object = Record<string, string>> = {
  setSubmitError: (message: string | null) => void;
  setFieldErrors?: (errors: E) => void;
};

export function hasFieldErrors<E extends object>(errors?: E): errors is E {
  return !!errors && Object.keys(errors).length > 0;
}

type FormFailure<E extends object = Record<string, string>> = {
  message: string;
  fieldErrors?: E;
};

// Show a failure on the form it came from: field errors land on the fields and
// suppress the form-level message; otherwise the message becomes the form-level
// submit error. Callers decide WHEN a failure belongs on a form (it carries
// field errors, or the reason's presentation is `inline`).
export function applyFormFailure<E extends object = Record<string, string>>(
  form: FormErrorSink<E>,
  failure: FormFailure<E>,
): void {
  if (form.setFieldErrors && hasFieldErrors(failure.fieldErrors)) {
    form.setFieldErrors(failure.fieldErrors);
    form.setSubmitError(null);
    return;
  }

  form.setSubmitError(failure.message);
}
