import { useState } from 'react';
import type { LoginRequest } from '@/models/auth.types';

export type LoginFieldErrors = Partial<Record<keyof LoginRequest, string>>;

const initialValues: LoginRequest = {
  email: '',
  password: '',
};

export function useLoginForm() {
  const [values, setValues] = useState<LoginRequest>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setValues(initialValues);
    setFieldErrors({});
    setSubmitError(null);
    setIsSubmitting(false);
  }

  function setField(name: keyof LoginRequest, value: string) {
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
    setField,
    setFieldErrors,
    setIsSubmitting,
    setSubmitError,
    submitError,
    values,
  };
}
