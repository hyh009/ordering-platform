import type {
  Category,
  CreateCategoryRequest,
  LocalizedStringDto,
} from '@/models/category';
import { useFormState } from '@/shared/hooks/useFormState';

export type CategoryFormValues = {
  name: LocalizedStringDto;
  description: LocalizedStringDto;
  isActive: boolean;
};

export type CategoryFormField = keyof CategoryFormValues;
export type CategoryFormFieldErrors = Partial<
  Record<CategoryFormField, string>
>;

const initialValues: CategoryFormValues = {
  name: {},
  description: {},
  isActive: true,
};

// Drop empty locales so an untouched language does not fail the per-locale
// min-length rule; return undefined when nothing was entered.
function cleanLocalized(
  value: LocalizedStringDto,
): LocalizedStringDto | undefined {
  const cleaned: LocalizedStringDto = {};

  for (const [locale, text] of Object.entries(value)) {
    const trimmed = text?.trim();
    if (trimmed) {
      cleaned[locale as keyof LocalizedStringDto] = trimmed;
    }
  }

  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

// Create and update share the same payload shape: name is always present, which
// satisfies both CreateCategoryRequest and UpdateCategoryRequest.
export function toCategoryRequest(
  values: CategoryFormValues,
): CreateCategoryRequest {
  return {
    name: values.name as CreateCategoryRequest['name'],
    description: cleanLocalized(values.description),
    isActive: values.isActive,
  };
}

export function valuesFromCategory(category: Category): CategoryFormValues {
  return {
    name: category.name,
    description: category.description ?? {},
    isActive: category.isActive,
  };
}

export function useCategoryForm() {
  return useFormState(initialValues);
}
