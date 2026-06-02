import { useState } from 'react';
import type {
  CreateDietaryMarkerRequest,
  DietaryMarker,
  DietaryMarkerType,
  UpdateDietaryMarkerRequest,
} from '@/models/metadata';

export type DietaryMarkerFormValues = {
  en: string;
  icon: string;
  isActive: boolean;
  key: string;
  type: DietaryMarkerType;
  zhTw: string;
};

export type DietaryMarkerFormField = keyof DietaryMarkerFormValues;
export type DietaryMarkerFormFieldErrors = Partial<
  Record<DietaryMarkerFormField, string>
>;

const initialValues: DietaryMarkerFormValues = {
  en: '',
  icon: '',
  isActive: true,
  key: '',
  type: 'dietary',
  zhTw: '',
};

function nameFromValues(values: DietaryMarkerFormValues) {
  return {
    en: values.en.trim() || undefined,
    'zh-TW': values.zhTw.trim(),
  };
}

export function toCreateDietaryMarkerRequest(
  values: DietaryMarkerFormValues,
): CreateDietaryMarkerRequest {
  const icon = values.icon.trim();

  return {
    icon: icon || undefined,
    isActive: values.isActive,
    key: values.key.trim(),
    name: nameFromValues(values),
    type: values.type,
  };
}

export function toUpdateDietaryMarkerRequest(
  values: DietaryMarkerFormValues,
): UpdateDietaryMarkerRequest {
  const icon = values.icon.trim();

  return {
    icon: icon || null,
    isActive: values.isActive,
    name: nameFromValues(values),
    type: values.type,
  };
}

export function valuesFromDietaryMarker(
  marker: DietaryMarker,
): DietaryMarkerFormValues {
  return {
    en: marker.name.en ?? '',
    icon: marker.icon ?? '',
    isActive: marker.isActive,
    key: marker.key,
    type: marker.type,
    zhTw: marker.name['zh-TW'] ?? '',
  };
}

export function useDietaryMarkerForm() {
  const [values, setValues] = useState<DietaryMarkerFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<DietaryMarkerFormFieldErrors>(
    {},
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset(nextValues: DietaryMarkerFormValues = initialValues) {
    setValues(nextValues);
    setFieldErrors({});
    setSubmitError(null);
    setIsSubmitting(false);
  }

  function setField(name: DietaryMarkerFormField, value: string | boolean) {
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
