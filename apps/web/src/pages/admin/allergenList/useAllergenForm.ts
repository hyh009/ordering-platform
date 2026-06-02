import { useState } from 'react';
import type {
  Allergen,
  CreateAllergenRequest,
  UpdateAllergenRequest,
} from '@/models/metadata';

export type AllergenFormValues = {
  en: string;
  icon: string;
  isActive: boolean;
  key: string;
  zhTw: string;
};

export type AllergenFormField = keyof AllergenFormValues;
export type AllergenFormFieldErrors = Partial<
  Record<AllergenFormField, string>
>;

const initialValues: AllergenFormValues = {
  en: '',
  icon: '',
  isActive: true,
  key: '',
  zhTw: '',
};

function nameFromValues(values: AllergenFormValues) {
  return {
    en: values.en.trim() || undefined,
    'zh-TW': values.zhTw.trim(),
  };
}

export function toCreateAllergenRequest(
  values: AllergenFormValues,
): CreateAllergenRequest {
  const icon = values.icon.trim();

  return {
    icon: icon || undefined,
    isActive: values.isActive,
    key: values.key.trim(),
    name: nameFromValues(values),
  };
}

export function toUpdateAllergenRequest(
  values: AllergenFormValues,
): UpdateAllergenRequest {
  const icon = values.icon.trim();

  return {
    icon: icon || null,
    isActive: values.isActive,
    name: nameFromValues(values),
  };
}

export function valuesFromAllergen(allergen: Allergen): AllergenFormValues {
  return {
    en: allergen.name.en ?? '',
    icon: allergen.icon ?? '',
    isActive: allergen.isActive,
    key: allergen.key,
    zhTw: allergen.name['zh-TW'] ?? '',
  };
}

export function useAllergenForm() {
  const [values, setValues] = useState<AllergenFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<AllergenFormFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset(nextValues: AllergenFormValues = initialValues) {
    setValues(nextValues);
    setFieldErrors({});
    setSubmitError(null);
    setIsSubmitting(false);
  }

  function setField(name: AllergenFormField, value: string | boolean) {
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
