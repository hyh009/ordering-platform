import { useState } from 'react';
import type { OrganizationFormValues } from '@/models/organization';
import type {
  OrganizationFormField,
  OrganizationFormFieldErrors,
} from '@/features/organization/formFieldErrors';

const initialValues: OrganizationFormValues = {
  name: '',
  ownerUserId: '',
  status: 'active',
  domain: '',
  contactEmail: '',
  contactPhone: '',
  address: {
    city: '',
    district: '',
    postalCode: '',
    streetAddress: '',
  },
};

function areOrganizationFormValuesEqual(
  left: OrganizationFormValues,
  right: OrganizationFormValues,
): boolean {
  return (
    left.name === right.name &&
    left.ownerUserId === right.ownerUserId &&
    left.status === right.status &&
    left.domain === right.domain &&
    left.contactEmail === right.contactEmail &&
    left.contactPhone === right.contactPhone &&
    left.address.city === right.address.city &&
    left.address.district === right.address.district &&
    left.address.postalCode === right.address.postalCode &&
    left.address.streetAddress === right.address.streetAddress
  );
}

export function useOrganizationForm() {
  const [values, setValues] = useState<OrganizationFormValues>(initialValues);
  const [baselineValues, setBaselineValues] =
    useState<OrganizationFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<OrganizationFormFieldErrors>(
    {},
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset(nextValues: OrganizationFormValues = initialValues) {
    setValues(nextValues);
    setBaselineValues(nextValues);
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

  function setAddress(value: OrganizationFormValues['address']) {
    setValues((current) => ({
      ...current,
      address: value,
    }));
    setFieldErrors((current) => ({
      ...current,
      'address.city': undefined,
      'address.district': undefined,
      'address.postalCode': undefined,
      'address.streetAddress': undefined,
    }));
    setSubmitError(null);
  }

  function hasFieldErrors() {
    return Object.values(fieldErrors).some(Boolean);
  }

  function hasChanges() {
    return !areOrganizationFormValuesEqual(baselineValues, values);
  }

  return {
    fieldErrors,
    hasFieldErrors,
    hasChanges,
    isSubmitting,
    reset,
    setAddress,
    setField,
    setFieldErrors,
    setIsSubmitting,
    setSubmitError,
    submitError,
    values,
  };
}

export type OrganizationFormVM = ReturnType<typeof useOrganizationForm>;
