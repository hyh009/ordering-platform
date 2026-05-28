import { useState } from 'react';
import type { OrganizationMembershipAddFormValues } from '@/models/organizationMembership';

const initialValues: OrganizationMembershipAddFormValues = {
  email: '',
  username: '',
  temporaryPassword: '',
  role: 'staff',
};

export function useAddMemberForm() {
  const [values, setValues] = useState<OrganizationMembershipAddFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof OrganizationMembershipAddFormValues, string | undefined>>
  >({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setValues(initialValues);
    setFieldErrors({});
    setSubmitError(null);
    setIsSubmitting(false);
  }

  function setField<K extends keyof OrganizationMembershipAddFormValues>(
    field: K,
    value: OrganizationMembershipAddFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
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

export type AddMemberFormVM = ReturnType<typeof useAddMemberForm>;
