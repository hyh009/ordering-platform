import type {
  Allergen,
  CreateAllergenRequest,
  LocalizedStringDto,
  UpdateAllergenRequest,
} from '@/models/metadata';
import { useFormState } from '@/shared/hooks/useFormState';

export type AllergenFormValues = {
  icon: string;
  isActive: boolean;
  key: string;
  name: LocalizedStringDto;
};

export type AllergenFormField = keyof AllergenFormValues;
export type AllergenFormFieldErrors = Partial<
  Record<AllergenFormField, string>
>;

const initialValues: AllergenFormValues = {
  icon: '',
  isActive: true,
  key: '',
  name: {},
};

export function toCreateAllergenRequest(
  values: AllergenFormValues,
): CreateAllergenRequest {
  const icon = values.icon.trim();

  return {
    icon: icon || undefined,
    isActive: values.isActive,
    key: values.key.trim(),
    name: values.name as CreateAllergenRequest['name'],
  };
}

export function toUpdateAllergenRequest(
  values: AllergenFormValues,
): UpdateAllergenRequest {
  const icon = values.icon.trim();

  return {
    icon: icon || null,
    isActive: values.isActive,
    name: values.name as UpdateAllergenRequest['name'],
  };
}

export function valuesFromAllergen(allergen: Allergen): AllergenFormValues {
  return {
    icon: allergen.icon ?? '',
    isActive: allergen.isActive,
    key: allergen.key,
    name: allergen.name,
  };
}

export function useAllergenForm() {
  return useFormState(initialValues);
}
