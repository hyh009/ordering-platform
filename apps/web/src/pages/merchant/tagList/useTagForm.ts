import type { CreateTagRequest, LocalizedStringDto, Tag } from '@/models/tag';
import { useFormState } from '@/shared/hooks/useFormState';

export type TagFormValues = {
  name: LocalizedStringDto;
  color: string;
  isActive: boolean;
};

export type TagFormField = keyof TagFormValues;
export type TagFormFieldErrors = Partial<Record<TagFormField, string>>;

const initialValues: TagFormValues = {
  name: {},
  color: '',
  isActive: true,
};

// Create and update share the same payload shape: a full field set with name
// always present, which satisfies both CreateTagRequest and UpdateTagRequest.
export function toTagRequest(values: TagFormValues): CreateTagRequest {
  const color = values.color.trim();

  return {
    name: values.name as CreateTagRequest['name'],
    color: color || undefined,
    isActive: values.isActive,
  };
}

export function valuesFromTag(tag: Tag): TagFormValues {
  return {
    name: tag.name,
    color: tag.color ?? '',
    isActive: tag.isActive,
  };
}

export function useTagForm() {
  return useFormState(initialValues);
}
