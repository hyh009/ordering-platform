import { useState } from 'react';
import type { RegisterRequest } from '@/models/auth.types';

export type RegisterFormValues = RegisterRequest & {
  confirmPassword: string;
};

export type RegisterFieldErrors = Partial<
  Record<keyof RegisterFormValues, string>
>;

const initialValues: RegisterFormValues = {
  confirmPassword: '',
  email: '',
  password: '',
  username: '',
};

export function useRegisterForm() {
  const [values, setValues] = useState<RegisterFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setValues(initialValues);
    setFieldErrors({});
    setSubmitError(null);
    setIsSubmitting(false);
  }

  function setField(name: keyof RegisterFormValues, value: string) {
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
