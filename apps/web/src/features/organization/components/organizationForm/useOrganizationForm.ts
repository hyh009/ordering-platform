import { useState } from 'react';
import type {
  CreateOrganizationRequest,
  Organization,
  OrganizationStatus,
  UpdateOrganizationRequest,
} from '@/models/organization.types';

export type OrganizationFormValues = {
  name: string;
  ownerUserId: string;
  status: OrganizationStatus;
};

export type OrganizationFormField = keyof OrganizationFormValues;
export type OrganizationFormFieldErrors = Partial<
  Record<OrganizationFormField, string>
>;

const initialValues: OrganizationFormValues = {
  name: '',
  ownerUserId: '',
  status: 'active',
};

export function toCreateOrganizationRequest(
  values: OrganizationFormValues,
): CreateOrganizationRequest {
  return {
    name: values.name.trim(),
    ownerUserId: values.ownerUserId.trim(),
  };
}

export function toUpdateOrganizationRequest(
  values: OrganizationFormValues,
): UpdateOrganizationRequest {
  return {
    name: values.name.trim(),
    status: values.status,
  };
}

export function valuesFromOrganization(
  organization: Organization,
): OrganizationFormValues {
  return {
    name: organization.name,
    ownerUserId: '',
    status: organization.status,
  };
}

export function useOrganizationForm() {
  const [values, setValues] = useState<OrganizationFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<OrganizationFormFieldErrors>(
    {},
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset(nextValues: OrganizationFormValues = initialValues) {
    setValues(nextValues);
    setFieldErrors({});
    setSubmitError(null);
    setIsSubmitting(false);
  }

  function setField(name: OrganizationFormField, value: string) {
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

export type OrganizationFormVM = ReturnType<typeof useOrganizationForm>;
