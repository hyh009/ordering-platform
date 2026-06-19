import { useState } from 'react';

export type FormState<TValues extends Record<string, unknown>> = {
  fieldErrors: Partial<Record<keyof TValues, string>>;
  isSubmitting: boolean;
  reset: (nextValues?: TValues) => void;
  resetErrors: () => void;
  setField: <K extends keyof TValues>(name: K, value: TValues[K]) => void;
  setFieldErrors: (errors: Partial<Record<keyof TValues, string>>) => void;
  setIsSubmitting: (value: boolean) => void;
  setSubmitError: (error: string | null) => void;
  submitError: string | null;
  values: TValues;
};

export function useFormState<TValues extends Record<string, unknown>>(
  defaultValues: TValues,
): FormState<TValues> {
  const [values, setValues] = useState<TValues>(defaultValues);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof TValues, string>>
  >({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset(nextValues: TValues = defaultValues) {
    setValues(nextValues);
    setFieldErrors({});
    setSubmitError(null);
    setIsSubmitting(false);
  }

  // Clear both error slots without touching values — call at submit start so a
  // prior submit's field errors do not linger when the next failure is not a
  // field error.
  function resetErrors() {
    setFieldErrors({});
    setSubmitError(null);
  }

  function setField<K extends keyof TValues>(name: K, value: TValues[K]) {
    setValues((current) => ({
      ...current,
      [name]: value,
    }));
    setFieldErrors((current) => ({
      ...current,
      [name]: undefined,
    }));
    setSubmitError(null);
  }

  return {
    fieldErrors,
    isSubmitting,
    reset,
    resetErrors,
    setField,
    setFieldErrors,
    setIsSubmitting,
    setSubmitError,
    submitError,
    values,
  };
}
