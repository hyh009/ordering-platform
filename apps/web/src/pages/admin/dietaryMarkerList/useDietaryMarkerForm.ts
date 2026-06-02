import type {
  CreateDietaryMarkerRequest,
  DietaryMarker,
  DietaryMarkerType,
  LocalizedStringDto,
  UpdateDietaryMarkerRequest,
} from '@/models/metadata';
import { useFormState } from '@/shared/hooks/useFormState';

export type DietaryMarkerFormValues = {
  icon: string;
  isActive: boolean;
  key: string;
  name: LocalizedStringDto;
  type: DietaryMarkerType;
};

export type DietaryMarkerFormField = keyof DietaryMarkerFormValues;
export type DietaryMarkerFormFieldErrors = Partial<
  Record<DietaryMarkerFormField, string>
>;

const initialValues: DietaryMarkerFormValues = {
  icon: '',
  isActive: true,
  key: '',
  name: {},
  type: 'dietary',
};

export function toCreateDietaryMarkerRequest(
  values: DietaryMarkerFormValues,
): CreateDietaryMarkerRequest {
  const icon = values.icon.trim();

  return {
    icon: icon || undefined,
    isActive: values.isActive,
    key: values.key.trim(),
    name: values.name as CreateDietaryMarkerRequest['name'],
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
    name: values.name as UpdateDietaryMarkerRequest['name'],
    type: values.type,
  };
}

export function valuesFromDietaryMarker(
  marker: DietaryMarker,
): DietaryMarkerFormValues {
  return {
    icon: marker.icon ?? '',
    isActive: marker.isActive,
    key: marker.key,
    name: marker.name,
    type: marker.type,
  };
}

export function useDietaryMarkerForm() {
  return useFormState(initialValues);
}
